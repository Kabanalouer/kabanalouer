import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { EMAIL_CATALOG } from "@/lib/adminEmailCatalog";
import { SITE_URL } from "@/lib/siteUrl";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";
import { sendImportPublishedEmail } from "@/lib/emails/importPublished";
import { sendBoostInviteEmail, sendInstallAppGuideEmail } from "@/lib/emails/hostOnboarding";
import { sendNewMessageNotificationEmail } from "@/lib/emails/newMessageNotification";
import { sendReviewReceivedEmail } from "@/lib/emails/reviewReceived";
import { sendFeaturedConfirmationEmail, sendFeaturedExpiringEmail, sendFeaturedExpiredEmail } from "@/lib/emails/featuredListing";
import { sendSubscriptionReminderEmail, sendAutoRenewalReminderEmail, sendPaymentFailedEmail } from "@/lib/emails/subscriptionReminder";
import { sendWinbackReminderEmail } from "@/lib/emails/winbackReminder";
import { sendWelcomeTravelerEmail } from "@/lib/emails/welcomeTraveler";
import { sendReviewRequestEmail, sendStayReviewRequestEmail } from "@/lib/emails/reviewRequest";
import { sendReviewRepliedEmail } from "@/lib/emails/reviewReplied";
import { sendContactMessageNotification } from "@/lib/emails/contactMessageNotification";
import { sendImportReviewNotification } from "@/lib/emails/importNotification";

// Envoi de test d'un courriel du catalogue (Admin → Séquences courriel), avec
// des données d'exemple basées sur la fiche Chalet Authentik 50.

const HOST_ID = "a13361e0-5492-4fa1-bec9-99b4e4530ea0";
const TRAVELER_ID = "2906e67b-9f60-4410-8237-9df496ca802d";
const LISTING_ID = "776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72";
const LISTING_PATH = "/chalets/laurentides/mille-isles/48347";
const TITLE = "Chalet Authentik 50 | Spa, Piscine chauffée & Lac";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Lang = "fr" | "en";
type Sender = (to: string, lang: Lang) => Promise<{ error: Error | null }>;

function senders(): Record<string, Sender> {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const month = new Date().toISOString().slice(0, 7);
  const inDays = (d: number) => new Date(Date.now() + d * 86400000);
  const base = (to: string, lang: Lang) => ({ email: to, preferredLanguage: lang, firstName: "Simon" });
  const featured = (to: string, lang: Lang) => ({
    ...base(to, lang), listingId: LISTING_ID, listingTitle: TITLE, type: "region" as const, region: "Laurentides", month,
  });
  const prefix = (lang: Lang) => (lang === "en" ? "/en" : "");
  const sampleMessage = (lang: Lang) =>
    lang === "fr"
      ? "Bonjour ! Nous sommes une famille de 4 et aimerions réserver du 10 au 13 octobre. Le spa est-il disponible ?"
      : "Hi! We’re a family of 4 and would like to book October 10 to 13. Is the hot tub available?";

  return {
    "welcome-subscription": (to, lang) => sendWelcomeSubscriptionEmail({ ...base(to, lang), listingTitle: TITLE }),
    "import-published": (to, lang) => sendImportPublishedEmail({ ...base(to, lang), listingPath: `${prefix(lang)}${LISTING_PATH}`, listingTitle: TITLE, isFreeLaunch: true }),
    "boost-invite": (to, lang) => sendBoostInviteEmail({ email: to, lang, firstName: "Simon", listingTitle: TITLE, listingId: LISTING_ID }),
    "install-app": (to, lang) => sendInstallAppGuideEmail({ email: to, lang, firstName: "Simon", hasPhone: false }),
    "new-message-host": (to, lang) => sendNewMessageNotificationEmail(admin, {
      email: to, preferredLanguage: lang, recipientFirstName: "Simon", recipientId: HOST_ID,
      senderFirstName: "Emma", listingTitle: TITLE, messageCount: 1, previewText: sampleMessage(lang),
      recipientIsHost: true, listingId: LISTING_ID, otherUserId: TRAVELER_ID,
    }),
    "review-received": (to, lang) => sendReviewReceivedEmail({
      hostEmail: to, hostFirstName: "Simon", preferredLanguage: lang, listingTitle: TITLE, reviewerFirstName: "Emma", rating: 5,
      comment: lang === "fr" ? "Chalet magnifique, spa parfait et proprio très accueillant." : "Beautiful cabin, perfect hot tub and a very welcoming owner.",
    }),
    "featured-confirmation": (to, lang) => sendFeaturedConfirmationEmail(featured(to, lang)),
    "featured-expiring": (to, lang) => sendFeaturedExpiringEmail(featured(to, lang)),
    "featured-expired": (to, lang) => sendFeaturedExpiredEmail(featured(to, lang)),
    "reminder-30": (to, lang) => sendSubscriptionReminderEmail({ ...base(to, lang), threshold: 30, expiresAt: inDays(30), listingTitle: TITLE }),
    "reminder-10": (to, lang) => sendSubscriptionReminderEmail({ ...base(to, lang), threshold: 10, expiresAt: inDays(10), listingTitle: TITLE }),
    "reminder-3": (to, lang) => sendSubscriptionReminderEmail({ ...base(to, lang), threshold: 3, expiresAt: inDays(3), listingTitle: TITLE }),
    "auto-renewal": (to, lang) => sendAutoRenewalReminderEmail({ ...base(to, lang), expiresAt: inDays(30), listingTitle: TITLE, priceCents: 29900 }),
    "payment-failed": (to, lang) => sendPaymentFailedEmail({ ...base(to, lang), listingTitle: TITLE, priceCents: 29900 }),
    "winback-3": (to, lang) => sendWinbackReminderEmail({ ...base(to, lang), threshold: 3, listingTitle: TITLE }),
    "winback-14": (to, lang) => sendWinbackReminderEmail({ ...base(to, lang), threshold: 14, listingTitle: TITLE }),

    "welcome-traveler": (to, lang) => sendWelcomeTravelerEmail(base(to, lang)),
    "new-message-traveler": (to, lang) => sendNewMessageNotificationEmail(admin, {
      email: to, preferredLanguage: lang, recipientFirstName: "Emma", recipientId: TRAVELER_ID,
      senderFirstName: "Simon", listingTitle: TITLE, messageCount: 1,
      previewText: lang === "fr" ? "Bonjour Emma, oui le spa est disponible à ces dates !" : "Hi Emma, yes the hot tub is available on those dates!",
      recipientIsHost: false, listingId: LISTING_ID, otherUserId: HOST_ID,
    }),
    // Liens d'exemple : aucun jeton réel n'est créé pour un test
    "review-request": (to, lang) => sendReviewRequestEmail({
      ...base(to, lang), listingTitle: TITLE,
      echangeUrl: `${SITE_URL}${prefix(lang)}/avis/test/echange`, stayUrl: `${SITE_URL}${prefix(lang)}/avis/test/sejour`,
    }),
    "stay-review-request": (to, lang) => sendStayReviewRequestEmail({ ...base(to, lang), listingTitle: TITLE, stayUrl: `${SITE_URL}${prefix(lang)}/avis/test/sejour` }),
    "review-replied": (to, lang) => sendReviewRepliedEmail({
      travelerEmail: to, travelerFirstName: "Emma", preferredLanguage: lang, hostFirstName: "Simon",
      listingId: LISTING_ID, listingTitle: TITLE, rating: 5,
      comment: lang === "fr" ? "Chalet magnifique, spa parfait." : "Beautiful cabin, perfect hot tub.",
      reply: lang === "fr" ? "Merci Emma, au plaisir de vous revoir !" : "Thank you Emma, hope to see you again!",
    }),

    "contact-notification": () => sendContactMessageNotification({
      name: "Emma Test", email: "emma@example.com", subject: "Test de notification", message: "Ceci est un message de test envoyé depuis l’admin.",
    }),
    "import-notification": () => sendImportReviewNotification({ listingId: LISTING_ID, listingTitle: TITLE, platform: "airbnb", hostName: "Simon Lemay" }),
  };
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: unknown; to?: unknown; lang?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const lang: Lang = body?.lang === "en" ? "en" : "fr";

  const entry = EMAIL_CATALOG.find((e) => e.id === id);
  const send = senders()[id];
  if (!entry || !entry.testable || !send) return NextResponse.json({ error: "Courriel inconnu" }, { status: 400 });
  if (!entry.fixedRecipient && !EMAIL_RE.test(to)) return NextResponse.json({ error: "Adresse courriel invalide" }, { status: 400 });

  try {
    const { error } = await send(to, lang);
    if (error) {
      console.error(`[admin/test-email] ${id}`, error);
      return NextResponse.json({ error: "L’envoi a échoué (voir les journaux)." }, { status: 502 });
    }
  } catch (err) {
    console.error(`[admin/test-email] ${id}`, err);
    return NextResponse.json({ error: "L’envoi a échoué (voir les journaux)." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, to: entry.fixedRecipient ?? to });
}
