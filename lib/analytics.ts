// Événements GA4 personnalisés. gtag.js est chargé en lazyOnload
// (components/GoogleAnalytics.tsx) : un clic fait avant son chargement est mis
// en file dans dataLayer — sous forme d'objet `arguments`, le seul format que
// gtag.js relit — puis envoyé une fois le script prêt. Sans
// NEXT_PUBLIC_GA_MEASUREMENT_ID, la file n'est jamais lue : aucun effet.

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

export type AnalyticsParams = Record<string, string | number | boolean>;

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
}
