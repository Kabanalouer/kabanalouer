import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";
import { sendBoostInviteEmail, sendInstallAppGuideEmail } from "@/lib/emails/hostOnboarding";
import { sendNewMessageNotificationEmail } from "@/lib/emails/newMessageNotification";
import { sendReviewReceivedEmail } from "@/lib/emails/reviewReceived";
import { sendFeaturedConfirmationEmail, sendFeaturedExpiringEmail, sendFeaturedExpiredEmail } from "@/lib/emails/featuredListing";
import { sendSubscriptionReminderEmail, sendAutoRenewalReminderEmail, sendPaymentFailedEmail } from "@/lib/emails/subscriptionReminder";
import { sendWinbackReminderEmail } from "@/lib/emails/winbackReminder";

// TEMPORAIRE — envoie une copie de test de chaque courriel proprio, dans
// l'ordre de réception après une publication, à l'adresse de test fixe.
// Réservé aux admins. À supprimer après usage.

const TO = "info@chaletauthentik.com";
const HOST_ID = "a13361e0-5492-4fa1-bec9-99b4e4530ea0";
const TRAVELER_ID = "2906e67b-9f60-4410-8237-9df496ca802d";
const LISTING_ID = "776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72";
const TITLE = "Chalet Authentik 50 | Spa, Piscine chauffée & Lac";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const base = { email: TO, preferredLanguage: "fr" as const, firstName: "Simon" };
  const month = new Date().toISOString().slice(0, 7);
  const in30 = new Date(Date.now() + 30 * 86400000);
  const in10 = new Date(Date.now() + 10 * 86400000);
  const in3 = new Date(Date.now() + 3 * 86400000);

  const steps: [string, () => Promise<{ error: Error | null }>][] = [
    ["1. Publication — abonnement actif", () => sendWelcomeSubscriptionEmail({ ...base, listingTitle: TITLE })],
    ["2. 48 h — invitation à booster", () => sendBoostInviteEmail({ email: TO, lang: "fr", firstName: "Simon", listingTitle: TITLE, listingId: LISTING_ID })],
    ["3. 96 h — installer l'app", () => sendInstallAppGuideEmail({ email: TO, lang: "fr", firstName: "Simon", hasPhone: false })],
    ["4. Nouveau message d'un voyageur", () => sendNewMessageNotificationEmail(admin, {
      email: TO, preferredLanguage: "fr", recipientFirstName: "Simon", recipientId: HOST_ID,
      senderFirstName: "Emma", listingTitle: TITLE, messageCount: 1,
      previewText: "Bonjour ! Nous sommes une famille de 4 et aimerions réserver du 10 au 13 octobre. Le spa est-il disponible ?",
      previewTranslated: false, recipientIsHost: true, listingId: LISTING_ID, otherUserId: TRAVELER_ID,
    })],
    ["5. Nouvel avis reçu", () => sendReviewReceivedEmail({ hostEmail: TO, hostFirstName: "Simon", preferredLanguage: "fr", listingTitle: TITLE, reviewerFirstName: "Emma", rating: 5, comment: "Chalet magnifique, spa parfait et proprio très accueillant." })],
    ["6. Boost acheté — confirmation", () => sendFeaturedConfirmationEmail({ ...base, listingId: LISTING_ID, listingTitle: TITLE, type: "region", region: "Laurentides", month })],
    ["7. Boost — fin dans 3 jours", () => sendFeaturedExpiringEmail({ ...base, listingId: LISTING_ID, listingTitle: TITLE, type: "region", region: "Laurentides", month })],
    ["8. Boost — terminé", () => sendFeaturedExpiredEmail({ ...base, listingId: LISTING_ID, listingTitle: TITLE, type: "region", region: "Laurentides", month })],
    ["9. Offre gratuite — rappel 30 jours", () => sendSubscriptionReminderEmail({ ...base, threshold: 30, expiresAt: in30, listingTitle: TITLE })],
    ["10. Offre gratuite — rappel 10 jours", () => sendSubscriptionReminderEmail({ ...base, threshold: 10, expiresAt: in10, listingTitle: TITLE })],
    ["11. Offre gratuite — rappel 3 jours", () => sendSubscriptionReminderEmail({ ...base, threshold: 3, expiresAt: in3, listingTitle: TITLE })],
    ["12. Abonnement payant — renouvellement dans 30 jours", () => sendAutoRenewalReminderEmail({ ...base, expiresAt: in30, listingTitle: TITLE, priceCents: 29900 })],
    ["13. Paiement refusé", () => sendPaymentFailedEmail({ ...base, listingTitle: TITLE, priceCents: 29900 })],
    ["14. Annonce dépubliée — relance 3 jours", () => sendWinbackReminderEmail({ ...base, threshold: 3, listingTitle: TITLE })],
    ["15. Annonce dépubliée — relance 14 jours", () => sendWinbackReminderEmail({ ...base, threshold: 14, listingTitle: TITLE })],
  ];

  const results: { step: string; ok: boolean; error?: string }[] = [];
  for (const [label, send] of steps) {
    try {
      const { error } = await send();
      results.push({ step: label, ok: !error, ...(error ? { error: error.message } : {}) });
    } catch (err) {
      results.push({ step: label, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    await wait(1200); // garde l'ordre dans la boîte de réception, sous la limite d'envoi Resend
  }
  return NextResponse.json({ to: TO, results });
}
