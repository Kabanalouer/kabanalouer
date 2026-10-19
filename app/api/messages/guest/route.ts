import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";
import { buildReplyToAddress, getOrCreateEmailReplyAddress } from "@/lib/emailReplyAddress";
import { sendGuestRequestEmail } from "@/lib/emails/guestRequest";
import { SITE_URL } from "@/lib/siteUrl";

// Demande de prix d'un visiteur SANS compte visible (2026-10-19, décision de Simon) :
// le compte voyageur est créé en coulisses (sans mot de passe), la demande entre dans la
// messagerie du proprio comme n'importe quel message, et le voyageur reçoit un récapitulatif
// dont le Reply-To est l'adresse de la conversation (répondre = écrire au proprio).
//
// Protections : origine du site, champ piège, plafonds par adresse IP et par courriel
// (table guest_request_log, IP gardée seulement en empreinte), courriels jetables refusés.
// Courriel déjà lié à un compte : voyageur seulement, la demande part et le propriétaire du
// compte est prévenu (« ce n'était pas vous ? ») ; un proprio ou un admin doit se connecter.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const MAX_CONTENT = 5000;
const IP_PER_HOUR = 5;
const IP_PER_DAY = 15;
const EMAIL_PER_HOUR = 3;
const EMAIL_PER_DAY = 8;

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
  "yopmail.com", "yopmail.fr", "trashmail.com", "sharklasers.com", "getnada.com", "throwawaymail.com", "dispostable.com",
  "maildrop.cc", "fakeinbox.com", "mailnesia.com", "mintemail.com", "spamgourmet.com", "mohmal.com", "emailondeck.com",
  "tempail.com", "burnermail.io", "moakt.com", "discard.email", "mail.tm", "inboxkitten.com",
]);

const ALLOWED_HOSTS = new Set(["kabanalouer.ca", "www.kabanalouer.ca", "localhost"]);

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return ALLOWED_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function clientIp(request: NextRequest): string {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "inconnue").trim();
}

function formatDate(date: string | undefined, lang: "fr" | "en"): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T12:00:00`).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";
  const fail = (fr: string, en: string, status: number, code?: string) =>
    NextResponse.json({ error: t2(locale, fr, en), ...(code ? { code } : {}) }, { status });

  if (!originAllowed(request)) return fail("Requête refusée", "Request refused", 403);

  const body = await request.json().catch(() => ({}));
  // Champ piège : un humain ne le voit pas, un robot le remplit
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const listingId = String(body.listingId ?? "");
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const name = String(body.name ?? "").trim().slice(0, 60);
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!UUID.test(listingId) || !content || content.length > MAX_CONTENT || !name || !EMAIL.test(email) || email.length > 200) {
    return fail("Demande invalide", "Invalid request", 400);
  }
  if (DISPOSABLE.has(email.split("@")[1])) {
    return fail("Cette adresse courriel n’est pas acceptée. Utilisez une adresse permanente.", "This email address isn’t accepted. Please use a permanent address.", 400, "disposable");
  }

  const admin = adminSupabase();
  const { data: listing } = await admin.from("listings").select("host_id, title, title_en, is_published, is_test").eq("id", listingId).maybeSingle();
  if (!listing || !(listing.is_published === true || listing.is_test === true)) return fail("Annonce introuvable", "Listing not found", 404);
  const hostId = listing.host_id as string;

  // Plafonds anti-abus
  const ipHash = createHash("sha256").update(`${clientIp(request)}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex");
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const count = async (col: "ip_hash" | "email", value: string, since: string) => {
    const { count: n } = await admin.from("guest_request_log").select("id", { count: "exact", head: true }).eq(col, value).gte("created_at", since);
    return n ?? 0;
  };
  const [ipHour, ipDay, emailHour, emailDay] = await Promise.all([
    count("ip_hash", ipHash, hourAgo), count("ip_hash", ipHash, dayAgo), count("email", email, hourAgo), count("email", email, dayAgo),
  ]);
  if (ipHour >= IP_PER_HOUR || ipDay >= IP_PER_DAY || emailHour >= EMAIL_PER_HOUR || emailDay >= EMAIL_PER_DAY) {
    return fail("Trop de demandes envoyées. Réessayez plus tard.", "Too many requests sent. Please try again later.", 429);
  }
  await admin.from("guest_request_log").insert({ ip_hash: ipHash, email, listing_id: listingId });

  // Compte existant ou création en coulisses
  const firstName = name.split(/\s+/)[0];
  let userId: string;
  let existingAccount = false;
  let createdNow = false;
  const { data: existing } = await admin.from("users").select("id, role").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.role !== "traveler" || existing.id === hostId) {
      return fail("Un compte existe déjà avec cette adresse. Connectez-vous pour envoyer votre demande.", "An account already exists with this address. Please sign in to send your request.", 409, "login_required");
    }
    userId = existing.id as string;
    existingAccount = true;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role: "traveler", first_name: firstName, name, preferred_language: lang, guest: true },
    });
    if (createError || !created?.user) {
      // Adresse déjà inscrite côté authentification sans profil lisible : connexion demandée
      return fail("Un compte existe déjà avec cette adresse. Connectez-vous pour envoyer votre demande.", "An account already exists with this address. Please sign in to send your request.", 409, "login_required");
    }
    userId = created.user.id;
    createdNow = true;
  }

  const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 50 ? v : undefined);
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const checkIn = date(body.checkIn);
  const checkOut = date(body.checkOut);

  const result = await insertMessageAndTranslate(admin, {
    listingId,
    senderId: userId,
    receiverId: hostId,
    content,
    checkIn,
    checkOut,
    numGuests: num(body.numGuests),
    numAdults: num(body.numAdults),
    numChildren: num(body.numChildren),
    numBabies: num(body.numBabies),
    numPets: num(body.numPets),
  });
  if ("error" in result) {
    if (createdNow) await admin.auth.admin.deleteUser(userId);
    return fail("L’envoi n’a pas fonctionné. Réessayez dans un instant.", "Sending failed. Please try again in a moment.", 500);
  }

  // Récapitulatif au voyageur : lien de connexion + réponse directe au proprio (Reply-To)
  try {
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    const messagesPath = lang === "en" ? "/en/messages" : "/messages";
    const followUrl = tokenHash
      ? `${SITE_URL}${lang === "en" ? "/en" : ""}/login?token_hash=${tokenHash}&type=magiclink&email=${encodeURIComponent(email)}&next=${encodeURIComponent(messagesPath)}`
      : `${SITE_URL}${messagesPath}`;
    const reply = await getOrCreateEmailReplyAddress(admin, { listingId, userAId: userId, userBId: hostId });
    const title = ((lang === "en" ? listing.title_en : null) || listing.title || (lang === "en" ? "the cabin" : "le chalet")) as string;
    const { error } = await sendGuestRequestEmail({
      to: email,
      lang,
      firstName,
      listingTitle: title,
      checkIn: formatDate(checkIn, lang),
      checkOut: formatDate(checkOut, lang),
      guests: num(body.numGuests) ?? null,
      message: typeof body.userMessage === "string" ? body.userMessage.slice(0, 2000) : null,
      followUrl,
      replyTo: "token" in reply ? buildReplyToAddress(reply.token) : undefined,
      existingAccount,
    });
    if (error) console.error("messages/guest: échec du récapitulatif", error.message);
  } catch (err) {
    // La demande est déjà dans la messagerie du proprio : le récapitulatif ne doit jamais la défaire
    console.error("messages/guest: récapitulatif", err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
