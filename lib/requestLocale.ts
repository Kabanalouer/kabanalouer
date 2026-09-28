// Détermine la langue d'interface de l'appelant d'une route API.
// Les fetch client partent d'une page : le Referer indique donc la langue affichée.
// Ordre : champ `locale` explicite → Referer (/en…) → cookie NEXT_LOCALE → Accept-Language → "fr".
//
// Note : next-intl est configuré avec localeDetection: false, donc le cookie
// NEXT_LOCALE n'est normalement pas posé — on le lit quand même au cas où.

export type RequestLocale = "fr" | "en";

function normalize(value: unknown): RequestLocale | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "en" || v.startsWith("en-")) return "en";
  if (v === "fr" || v.startsWith("fr-")) return "fr";
  return null;
}

export function getRequestLocale(req: Request, explicitLocale?: unknown): RequestLocale {
  const explicit = normalize(explicitLocale);
  if (explicit) return explicit;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const { pathname } = new URL(referer);
      return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
    } catch {
      // Referer invalide — on passe au critère suivant
    }
  }

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const fromCookie = normalize(match?.[1]);
    if (fromCookie) return fromCookie;
  }

  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) {
    const first = acceptLanguage.split(",")[0]?.split(";")[0];
    const fromHeader = normalize(first);
    if (fromHeader) return fromHeader;
  }

  return "fr";
}

/** Choisit la chaîne FR ou EN selon la langue. */
export function t2(locale: RequestLocale, fr: string, en: string): string {
  return locale === "en" ? en : fr;
}
