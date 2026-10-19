import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { claimListingsForUser } from "@/lib/claims/actions";
import { sendClaimDecisionEmail } from "@/lib/emails/unclaimedOwner";

// Traitement d'une demande de la file /admin/revendications (admin seulement) :
//   approve : transfère la fiche au demandeur (claim_listings) — rien ne bouge avant
//   refuse  : refuse, avec une explication facultative envoyée au demandeur
//   handled : classe un signalement (« Signaler un problème ») sans retour automatique

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Demande invalide" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = body.action as "approve" | "refuse" | "handled";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!["approve", "refuse", "handled"].includes(action)) return NextResponse.json({ error: "Action invalide" }, { status: 400 });

  const admin = adminSupabase();
  const { data: req } = await admin
    .from("claim_requests")
    .select("id, kind, status, listing_id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!req || req.status !== "pending") return NextResponse.json({ error: "Demande introuvable ou déjà traitée" }, { status: 404 });

  const { data: listing } = await admin.from("listings").select("title, title_en").eq("id", req.listing_id).maybeSingle();
  const title = ((listing?.title as string | null) ?? "(sans titre)");

  if (action === "handled") {
    if (req.kind !== "dispute") return NextResponse.json({ error: "Seuls les signalements se classent ainsi" }, { status: 400 });
  } else if (req.kind !== "proof" || !req.user_id) {
    return NextResponse.json({ error: "Cette action concerne une demande de vérification" }, { status: 400 });
  }

  if (action === "approve") {
    // Le transfert d'abord : si la fiche a été revendiquée entre-temps, rien n'est marqué approuvé.
    // Un propriétaire avec plusieurs chalets n'envoie qu'un permis : les autres fiches non
    // revendiquées liées à la même adresse au dossier suivent (la page admin les liste avant l'approbation).
    const { data: base } = await admin.from("listings").select("claim_email, is_test").eq("id", req.listing_id).maybeSingle();
    let listingIds = [req.listing_id as string];
    if (base?.claim_email) {
      const { data: siblings } = await admin
        .from("listings")
        .select("id")
        .eq("claim_status", "unclaimed")
        .eq("claim_email", base.claim_email)
        .eq("is_test", base.is_test as boolean);
      listingIds = Array.from(new Set([...listingIds, ...((siblings ?? []).map((s) => s.id as string))]));
    }
    const result = await claimListingsForUser(admin, { userId: req.user_id as string, listingIds });
    if (!result.ok) return NextResponse.json({ error: "Transfert impossible : la fiche n'est probablement plus disponible." }, { status: 409 });
  }

  const status = action === "approve" ? "approved" : action === "refuse" ? "refused" : "handled";
  const { error } = await admin
    .from("claim_requests")
    .update({ status, admin_note: note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) {
    console.error("admin/claims: échec de mise à jour", error);
    return NextResponse.json({ error: "Erreur d'enregistrement" }, { status: 500 });
  }

  if (action !== "handled" && req.user_id) {
    const { data: requester } = await admin.from("users").select("email, preferred_language").eq("id", req.user_id).maybeSingle();
    if (requester?.email) {
      const { error: mailError } = await sendClaimDecisionEmail({
        to: requester.email as string,
        lang: requester.preferred_language === "en" ? "en" : "fr",
        listingTitle: title,
        approved: action === "approve",
        adminNote: note,
      });
      if (mailError) console.error("admin/claims: échec du courriel de décision", mailError);
    }
  }
  return NextResponse.json({ ok: true });
}
