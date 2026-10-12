// Événements de mesure. GA4 : gtag.js est chargé en lazyOnload
// (components/GoogleAnalytics.tsx) : un clic fait avant son chargement est mis
// en file dans dataLayer — sous forme d'objet `arguments`, le seul format que
// gtag.js relit — puis envoyé une fois le script prêt. Sans
// NEXT_PUBLIC_GA_MEASUREMENT_ID, la file n'est jamais lue : aucun effet.
// Pixel Meta (components/MetaPixel.tsx) : window.fbq n'existe que si le
// visiteur a accepté la publicité ; les conversions de META_EVENTS y sont
// alors aussi envoyées, sans identifiant de chalet ni donnée personnelle.

type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    fbq?: FbqFn;
  }
}

export type AnalyticsParams = Record<string, string | number | boolean>;

// Événement GA4 → événement Meta (standard, sinon personnalisé).
const META_EVENTS: Record<string, { name: string; custom?: boolean; category?: string }> = {
  generate_lead: { name: "Lead", category: "lead_type" },
  sign_up: { name: "CompleteRegistration", category: "role" },
  contact_form_submit: { name: "Contact" },
  begin_checkout: { name: "InitiateCheckout" },
  listing_create: { name: "ListingCreate", custom: true, category: "method" },
  listing_publish: { name: "ListingPublish", custom: true },
};

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag("event", name, params);

  const meta = META_EVENTS[name];
  if (meta && window.fbq) {
    const value = meta.category ? params[meta.category] : undefined;
    const data = value !== undefined ? { content_category: String(value) } : {};
    window.fbq(meta.custom ? "trackCustom" : "track", meta.name, data);
  }
}
