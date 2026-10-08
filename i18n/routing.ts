import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
  // Pas de cookie NEXT_LOCALE : la langue vient uniquement de l'URL, et un
  // Set-Cookie sur chaque réponse empêchait la mise en cache des pages
  // publiques (voir isPublicCacheable dans middleware.ts).
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
