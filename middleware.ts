import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Photos des fiches retirées par leur propriétaire (2026-10-24) : fichiers supprimés du stockage, mais Vercel garde des
// copies optimisées qu'il sert « périmées » même après invalidation. Toute adresse d'image qui mentionne l'une de ces
// fiches est refusée ici, avant le cache. Le matcher de `config` (en bas, ids de fiches en toutes lettres : Next
// n'accepte pas de valeur calculée) est étroit : condition sur le paramètre `url`, donc le middleware ne tourne PAS pour
// les autres images. À compléter avec l'id de chaque nouvelle fiche retirée dont les photos ont déjà été affichées
// (CLAUDE.md, « Propriétaire qui retire sa fiche »).
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") {
    return new NextResponse(null, { status: 404 });
  }
  // Admin routes: pas de locale, pas de refresh session — AdminLayout gère l'auth directement
  // Auth routes (ex. /auth/callback) : pas d'équivalent sous app/[locale], la réécriture i18n causait un 404
  if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  // next-intl: locale detection, redirects (e.g. /fr/dashboard → /dashboard)
  const intlResponse = intlMiddleware(request);

  // If next-intl returns a redirect, pass it through immediately.
  // next-intl always issues a 307 (temporary) here — but under
  // localePrefix "as-needed", a prefix-normalization redirect like
  // /fr/chalets → /chalets is a permanent URL change from an SEO
  // standpoint, so force 308 to consolidate link equity correctly.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    const location = intlResponse.headers.get("location");
    if (!location) return intlResponse;
    const permanentResponse = NextResponse.redirect(location, 308);
    intlResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "location") {
        permanentResponse.headers.set(key, value);
      }
    });
    return permanentResponse;
  }

  // Pass-through: build a fresh response that forwards the updated request to Next.js,
  // then copy next-intl locale headers onto it before returning.
  let finalResponse = NextResponse.next({ request });
  intlResponse.headers.forEach((value, key) => {
    finalResponse.headers.set(key, value);
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate the response with updated request cookies, then re-apply locale headers
          finalResponse = NextResponse.next({ request });
          intlResponse.headers.forEach((value, key) => {
            finalResponse.headers.set(key, value);
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            finalResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the Supabase session with a 2s timeout.
  // Without this guard, a slow/unreachable Supabase causes MIDDLEWARE_INVOCATION_TIMEOUT on Vercel.
  let user: { user_metadata?: { preferred_language?: string } } | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("supabase-timeout")), 2000)
      ),
    ]);
    user = result.data.user;
  } catch {
    // Session refresh timed out or failed — request continues without refreshing
  }

  // Langue préférée : uniquement dans l'espace connecté (dashboard/messages/favoris).
  // Les pages publiques restent librement navigables dans l'une ou l'autre langue
  // (sélecteur du footer) même pour un utilisateur connecté.
  const { pathname } = request.nextUrl;
  const isPrivateArea = ["/dashboard", "/messages", "/favoris"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`) || pathname.startsWith(`/en${base}/`) || pathname === `/en${base}`
  );
  if (user && isPrivateArea) {
    const preferredLanguage = user.user_metadata?.preferred_language;
    if (preferredLanguage === "fr" || preferredLanguage === "en") {
      const isEnPath = pathname === "/en" || pathname.startsWith("/en/");
      const currentLocale = isEnPath ? "en" : "fr";
      if (currentLocale !== preferredLanguage) {
        const basePath = isEnPath ? pathname.slice(3) || "/" : pathname;
        const targetPath = preferredLanguage === "en" ? `/en${basePath}` : basePath;
        const redirectUrl = new URL(`${targetPath}${request.nextUrl.search}`, request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return finalResponse;
}

export const config = {
  matcher: [
    { source: "/_next/image", has: [{ type: "query", key: "url", value: ".*(24fcaaa5-a9a6-43fc-b453-bcef1617c396|2c6ff3f6-a37f-471c-a6cb-557ea8f071b3|d37fccbc-7361-4375-8de9-18e2ab19a74e).*" }] },
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt|json|ico|webmanifest)$).*)",
  ],
};
