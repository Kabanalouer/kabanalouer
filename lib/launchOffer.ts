// Offre de lancement (première année gratuite par annonce) — l'interrupteur
// unique. Prolonger : changer la date. Terminer : mettre null. Tout en dépend :
// textes du site et des courriels, page Publier, /api/subscriptions/activate-free,
// publication admin des imports, rappel à l'admin 7 jours avant la fin.
// Sans offre, la publication passe par l'abonnement Stripe (lib/subscriptionPricing.ts).
export const LAUNCH_OFFER_END: string | null = "2026-10-31";

// Prix affiché quand il n'y a plus d'offre (1re annonce payante, tier1).
export const REGULAR_PRICE_CENTS = 29900;

// Date du jour à Montréal (AAAA-MM-JJ) : l'offre vaut jusqu'à la fin de la
// journée de LAUNCH_OFFER_END, heure du Québec, peu importe le serveur.
function montrealToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isLaunchOfferActive(now: Date = new Date()): boolean {
  return LAUNCH_OFFER_END !== null && montrealToday(now) <= LAUNCH_OFFER_END;
}

// Jours restants, le jour de fin compris (le 31 octobre → 1). Null sans offre.
export function launchOfferDaysLeft(now: Date = new Date()): number | null {
  if (!isLaunchOfferActive(now) || LAUNCH_OFFER_END === null) return null;
  const [y1, m1, d1] = montrealToday(now).split("-").map(Number);
  const [y2, m2, d2] = LAUNCH_OFFER_END.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000) + 1;
}

// « 31 octobre 2026 » / « October 31, 2026 » ; court : « 31 oct. 2026 » /
// « Oct 31, 2026 ». Espaces insécables en français. Null sans offre.
export function formatLaunchOfferEnd(locale: string, style: "long" | "short" = "long"): string | null {
  if (LAUNCH_OFFER_END === null) return null;
  const date = new Date(`${LAUNCH_OFFER_END}T12:00:00Z`);
  const formatted = date.toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  });
  return locale === "en" ? formatted : formatted.replace(/ /g, " ");
}
