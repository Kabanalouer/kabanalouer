import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import {
  canSendLinkEmail,
  claimLink,
  createClaimToken,
  findClaimToken,
  logOwnerEmail,
  removeLink,
} from "@/lib/claims/tokens";
import { claimListingsForUser, removeUnclaimedListing, reportClaimProblem } from "@/lib/claims/actions";
import { sendClaimAdminAlert, sendClaimLinkEmail } from "@/lib/emails/unclaimedOwner";

// Actions publiques des fiches non revendiquées (supabase/add-unclaimed-listings.sql) :
//   send-link : « Envoyer le lien à l'adresse que vous avez » (option A, sans connexion)
//   claim     : revendiquer avec un jeton (connexion obligatoire)
//   remove    : « Retirer ma fiche » (jeton, sans connexion)
//   report    : « Signaler un problème » après une activation (jeton)
//   request   : demande de vérification manuelle avec preuve (option B, connexion obligatoire)
// Toutes lisent et écrivent avec le client service ; rien n'est exposé à une session.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE = 5000;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_PROOF_REQUESTS_PER_DAY = 5;

type Admin = ReturnType<typeof adminSupabase>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const locale = getRequestLocale(request);
  switch (action) {
    case "send-link":
      return sendLink(request, locale);
    case "claim":
      return claim(request, locale);
    case "remove":
      return remove(request, locale);
    case "report":
      return report(request, locale);
    case "request":
      return proofRequest(request, locale);
    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

function bad(locale: "fr" | "en", fr: string, en: string, status = 400) {
  return NextResponse.json({ error: t2(locale, fr, en) }, { status });
}

async function sendLink(request: NextRequest, locale: "fr" | "en") {
  const body = await request.json().catch(() => ({}));
  const listingId = String(body.listingId ?? "");
  if (!UUID.test(listingId)) return bad(locale, "Fiche invalide", "Invalid listing");

  const admin = adminSupabase();
  const { data: listing } = await admin
    .from("listings")
    .select("id, claim_status, claim_email, claim_language")
    .eq("id", listingId)
    .maybeSingle();
  // Même réponse que si tout allait bien : on ne révèle pas quelles fiches ont une adresse.
  if (!listing || listing.claim_status !== "unclaimed" || !listing.claim_email) return NextResponse.json({ ok: true });

  const email = listing.claim_email as string;
  if (!(await canSendLinkEmail(admin, listing.id as string, email))) {
    return bad(locale, "Trop de demandes. Réessayez demain.", "Too many requests. Try again tomorrow.", 429);
  }
  await logOwnerEmail(admin, { claimEmail: email, listingId: listing.id as string, kind: "link_request" });

  const lang: "fr" | "en" = listing.claim_language === "en" ? "en" : "fr";
  // Un seul lien couvre toutes les fiches non revendiquées de cette adresse.
  const { data: all } = await admin
    .from("listings")
    .select("title, title_en")
    .eq("claim_email", email)
    .eq("claim_status", "unclaimed");
  const titles = (all ?? []).map((l) => ((lang === "en" ? l.title_en : null) || l.title || (lang === "en" ? "Your listing" : "Votre fiche")) as string);

  const [claimRaw, removeRaw] = await Promise.all([
    createClaimToken(admin, { kind: "claim", claimEmail: email, reason: "owner_request" }),
    createClaimToken(admin, { kind: "remove", claimEmail: email, listingId: listing.id as string, reason: "owner_request" }),
  ]);
  if (!claimRaw || !removeRaw) return bad(locale, "Erreur, réessayez.", "Error, try again.", 500);

  const { error } = await sendClaimLinkEmail({
    to: email,
    lang,
    listingTitles: titles,
    claimUrl: claimLink(lang, claimRaw),
    removeUrl: removeLink(lang, removeRaw),
  });
  if (error) {
    console.error("claims/send-link: échec envoi", error);
    return bad(locale, "Erreur, réessayez.", "Error, try again.", 500);
  }
  await logOwnerEmail(admin, { claimEmail: email, listingId: listing.id as string, kind: "link" });
  return NextResponse.json({ ok: true });
}

async function claim(request: NextRequest, locale: "fr" | "en") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad(locale, "Non authentifié", "Not authenticated", 401);

  const body = await request.json().catch(() => ({}));
  const admin = adminSupabase();
  const lookup = await findClaimToken(admin, String(body.token ?? ""), "claim");
  if (lookup.status !== "ok") return NextResponse.json({ error: lookup.status }, { status: 410 });

  // Toutes les fiches non revendiquées qui ont la même adresse, pas seulement celle d'où vient le lien.
  const { data: listings } = await admin
    .from("listings")
    .select("id")
    .eq("claim_email", lookup.token.claim_email)
    .eq("claim_status", "unclaimed");
  const listingIds = (listings ?? []).map((l) => l.id as string);
  if (listingIds.length === 0) return NextResponse.json({ error: "used" }, { status: 410 });

  const result = await claimListingsForUser(admin, { userId: user.id, listingIds, tokenId: lookup.token.id });
  if (!result.ok) return bad(locale, "L'activation a échoué.", "Activation failed.", 400);
  return NextResponse.json({ ok: true, count: result.listingIds.length });
}

async function remove(request: NextRequest, locale: "fr" | "en") {
  const body = await request.json().catch(() => ({}));
  const admin = adminSupabase();
  const lookup = await findClaimToken(admin, String(body.token ?? ""), "remove");
  if (lookup.status !== "ok") return NextResponse.json({ error: lookup.status }, { status: 410 });
  const result = await removeUnclaimedListing(admin, lookup.token);
  if (!result.ok) return bad(locale, "Le retrait a échoué.", "Removal failed.", 400);
  return NextResponse.json({ ok: true });
}

async function report(request: NextRequest, locale: "fr" | "en") {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) return bad(locale, "Message invalide", "Invalid message");
  const admin = adminSupabase();
  const lookup = await findClaimToken(admin, String(body.token ?? ""), "dispute");
  if (lookup.status !== "ok") return NextResponse.json({ error: lookup.status }, { status: 410 });
  const result = await reportClaimProblem(admin, lookup.token, message);
  if (!result.ok) return bad(locale, "L'envoi a échoué.", "Sending failed.", 500);
  return NextResponse.json({ ok: true });
}

// Option B : preuve dans un bucket privé (jamais public), demande dans la file
// /admin/revendications. Rien ne change sur la fiche avant l'approbation.
async function proofRequest(request: NextRequest, locale: "fr" | "en") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad(locale, "Non authentifié", "Not authenticated", 401);

  const form = await request.formData().catch(() => null);
  if (!form) return bad(locale, "Requête invalide", "Invalid request");
  const listingId = String(form.get("listingId") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const proof = form.get("proof");
  if (!UUID.test(listingId) || message.length > MAX_MESSAGE) return bad(locale, "Demande invalide", "Invalid request");
  if (!(proof instanceof File) || proof.size === 0) return bad(locale, "Joignez une copie de votre permis CITQ.", "Attach a copy of your CITQ permit.");

  const admin = adminSupabase();
  const { data: listing } = await admin
    .from("listings")
    .select("id, title, claim_status, claim_email, is_test")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.claim_status !== "unclaimed") return bad(locale, "Fiche indisponible", "Listing unavailable", 404);

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: recent } = await admin
    .from("claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "proof")
    .gte("created_at", dayAgo);
  if ((recent ?? 0) >= MAX_PROOF_REQUESTS_PER_DAY) return bad(locale, "Trop de demandes. Réessayez demain.", "Too many requests. Try again tomorrow.", 429);

  const { count: pending } = await admin
    .from("claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("user_id", user.id)
    .eq("kind", "proof")
    .eq("status", "pending");
  if ((pending ?? 0) > 0) return bad(locale, "Une demande est déjà en cours.", "A request is already pending.", 409);

  let proofPath: string | null = null;
  {
    const ext = PROOF_TYPES[proof.type];
    if (!ext || proof.size > MAX_PROOF_BYTES) return bad(locale, "Fichier non accepté. Formats acceptés : PDF, JPG, PNG ou WebP, 5 Mo maximum.", "File not accepted. Accepted formats: PDF, JPG, PNG or WebP, 5 MB maximum.");
    proofPath = await uploadProof(admin, `${listingId}/${user.id}-${Date.now()}.${ext}`, proof, proof.type);
    if (!proofPath) return bad(locale, "Le fichier n'a pas pu être envoyé.", "The file could not be uploaded.", 500);
  }

  const { error } = await admin.from("claim_requests").insert({
    kind: "proof",
    listing_id: listingId,
    user_id: user.id,
    contact_email: user.email ?? null,
    message: message || null,
    proof_path: proofPath,
  });
  if (error) {
    // 23505 : deux envois simultanés, un seul passe (index unique)
    if (error.code === "23505") return bad(locale, "Une demande est déjà en cours.", "A request is already pending.", 409);
    console.error("claims/request: échec insertion", error);
    return bad(locale, "Erreur, réessayez.", "Error, try again.", 500);
  }

  await sendClaimAdminAlert({
    kind: "proof",
    listingTitle: (listing.title as string | null) ?? "(sans titre)",
    listingId,
    from: user.email ?? user.id,
    message: message || null,
  });
  // Nombre d'autres fiches qu'une approbation transférera aussi (même adresse au dossier) : un nombre seulement
  let siblingCount = 0;
  if (listing.claim_email) {
    const { count } = await admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("claim_status", "unclaimed")
      .eq("claim_email", listing.claim_email as string)
      .eq("is_test", listing.is_test as boolean)
      .neq("id", listingId);
    siblingCount = count ?? 0;
  }
  return NextResponse.json({ ok: true, siblingCount });
}

async function uploadProof(admin: Admin, path: string, file: File, contentType: string): Promise<string | null> {
  const bucket = "claim-proofs";
  const upload = () => admin.storage.from(bucket).upload(path, file, { contentType, upsert: false });
  let { error } = await upload();
  if (error && /not found|bucket/i.test(error.message)) {
    // Bucket privé créé au premier envoi.
    const created = await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: MAX_PROOF_BYTES });
    if (created.error && !/already exists/i.test(created.error.message)) {
      console.error("claims/request: création du bucket impossible", created.error);
      return null;
    }
    ({ error } = await upload());
  }
  if (error) {
    console.error("claims/request: échec du dépôt", error);
    return null;
  }
  return path;
}
