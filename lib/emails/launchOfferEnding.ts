// Notification interne à Simon (admin) : l'offre de lancement se termine dans
// 7 jours (lib/launchOffer.ts). Envoyée par le cron quotidien
// host-onboarding-emails le jour où il reste exactement 7 jours — une seule
// fois, sans colonne de suivi. Même gabarit que contactMessageNotification.ts.
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { formatLaunchOfferEnd, REGULAR_PRICE_CENTS } from "@/lib/launchOffer";
import { formatPriceLabel } from "@/lib/subscriptionPricing";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

export async function sendLaunchOfferEndingNotification({ daysLeft }: { daysLeft: number }): Promise<{ error: Error | null }> {
  const endDate = formatLaunchOfferEnd("fr") ?? "";
  const price = formatPriceLabel(REGULAR_PRICE_CENTS, "fr");

  const html = renderEmail({
    lang: "fr",
    heading: "L’offre de lancement se termine bientôt",
    body:
      `L’offre de lancement (première année gratuite) se termine le <strong>${endDate}</strong>, dans ${daysLeft} jours.<br/><br/>` +
      `Après cette date, le site affichera automatiquement l’abonnement à ${price} par année et la publication passera par le paiement Stripe.<br/><br/>` +
      `Pour la prolonger, demande à Claude Code de changer la date de fin dans <strong>lib/launchOffer.ts</strong>.`,
    buttonLabel: "Voir la page Devenir proprio",
    buttonUrl: `${SITE_URL}/devenir-hote`,
    footerNote: "Notification automatique envoyée 7 jours avant la fin de l’offre.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `L’offre de lancement se termine le ${endDate}`,
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
