import { createClient as createAdminClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/siteUrl";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";
import { sendImportPublishedEmail } from "@/lib/emails/importPublished";
import { sendBoostInviteEmail, sendDraftReminderEmail, sendSmsInviteEmail } from "@/lib/emails/hostOnboarding";
import { sendNewMessageNotificationEmail } from "@/lib/emails/newMessageNotification";
import { sendReviewReceivedEmail } from "@/lib/emails/reviewReceived";
import { sendFeaturedConfirmationEmail, sendFeaturedExpiringEmail, sendFeaturedExpiredEmail } from "@/lib/emails/featuredListing";
import { sendSubscriptionReminderEmail, sendAutoRenewalReminderEmail, sendPaymentFailedEmail } from "@/lib/emails/subscriptionReminder";
import { sendWinbackReminderEmail } from "@/lib/emails/winbackReminder";
import { sendWelcomeTravelerEmail } from "@/lib/emails/welcomeTraveler";
import { sendReviewRequestEmail, sendStayReviewRequestEmail } from "@/lib/emails/reviewRequest";
import { sendReviewRepliedEmail } from "@/lib/emails/reviewReplied";
import { sendNoReplyNudgeEmail } from "@/lib/emails/noReplyNudge";
import { firstPhotoUrl } from "@/lib/photo";
import { buildListingPath } from "@/lib/listingUrl";
import { sendContactMessageNotification } from "@/lib/emails/contactMessageNotification";
import { sendImportReviewNotification } from "@/lib/emails/importNotification";
import { sendLaunchOfferEndingNotification } from "@/lib/emails/launchOfferEnding";

// Données d'exemple (fiche Chalet Authentik 50) de chaque courriel du catalogue :
// envoi de test (/api/admin/test-email) et aperçu de l'éditeur de textes
// (/api/admin/email-templates/preview).

const HOST_ID = "a13361e0-5492-4fa1-bec9-99b4e4530ea0";
const TRAVELER_ID = "2906e67b-9f60-4410-8237-9df496ca802d";
const LISTING_ID = "776cbb0b-f45f-4b0b-bea9-ebaf0ced7a72";
const LISTING_PATH = "/chalets/laurentides/mille-isles/48347";
const TITLE = "Chalet Authentik 50 | Spa, Piscine chauffée & Lac";

export type Lang = "fr" | "en";
export type Sender = (to: string, lang: Lang) => Promise<{ error: Error | null }>;

export function emailTestSenders(): Record<string, Sender> {
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
    "draft-reminder": (to, lang) => sendDraftReminderEmail({ email: to, lang, firstName: "Simon", listingTitle: TITLE, listingId: LISTING_ID }),
    "boost-invite": (to, lang) => sendBoostInviteEmail({ email: to, lang, firstName: "Simon", listingTitle: TITLE, listingId: LISTING_ID }),
    "sms-invite": (to, lang) => sendSmsInviteEmail({ email: to, lang, firstName: "Simon" }),
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
    "no-reply-nudge": async (to, lang) => {
      // 3 vrais chalets publiés (photos réelles) — liens et prix tels quels
      const { data } = await admin.from("listings")
        .select("title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, listing_number, custom_slug")
        .eq("is_published", true).eq("region", "Laurentides").limit(3);
      const suggestions = (data ?? []).map((l) => ({
        title: ((lang === "en" && l.title_en) || l.title) ?? "",
        city: l.city, capacity: l.capacity, bedrooms: l.bedrooms,
        price: l.price_low, priceOnRequest: !!l.price_on_request,
        photoUrl: firstPhotoUrl(l.photos) ?? null,
        path: buildListingPath(l, lang) ?? LISTING_PATH,
      }));
      return sendNoReplyNudgeEmail({
        email: to, preferredLanguage: lang, firstName: "Emma", hostFirstName: "Marc", listingTitle: TITLE,
        place: lang === "en" ? "in Mille-Isles" : "à Mille-Isles",
        placePath: lang === "en" ? "/en/cabins/laurentians/mille-isles" : "/chalets/laurentides/mille-isles",
        conversationPath: `${prefix(lang)}/messages?listing=${LISTING_ID}&with=${HOST_ID}`,
        suggestions,
      });
    },
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
      name: "Emma Test", email: "emma@example.com", message: "Ceci est un message de test envoyé depuis l’admin.",
    }),
    "launch-offer-ending": () => sendLaunchOfferEndingNotification({ daysLeft: 7 }),
    "import-notification": () => sendImportReviewNotification({ listingId: LISTING_ID, listingTitle: TITLE, platform: "airbnb", hostName: "Simon Lemay" }),
  };
}
