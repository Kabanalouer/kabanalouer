import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
  // Pas de cookie NEXT_LOCALE : la langue vient uniquement de l'URL
  // (localeDetection: false), le cookie n'était lu nulle part. Un Set-Cookie
  // sur chaque réponse empêcherait aussi toute mise en cache par le CDN.
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
