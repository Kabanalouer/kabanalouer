import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
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

  if (!user && isPublicCacheable(request) && finalResponse.cookies.getAll().length === 0) {
    // La clé de cache inclut l'en-tête Cookie (Vary: Cookie, next.config.ts) :
    // un visiteur connecté ne reçoit jamais la version anonyme mise en cache.
    finalResponse.headers.set("Vercel-CDN-Cache-Control", PUBLIC_CDN_CACHE);
  }

  return finalResponse;
}

// Mise en cache des pages publiques par le CDN de Vercel, pour les visiteurs
// non connectés seulement (Googlebot, premières visites). Les pages sont
// toujours rendues à la demande : seule la réponse HTML anonyme est gardée
// 5 minutes (puis resservie pendant qu'une version fraîche se calcule en
// arrière-plan). Une modification d'annonce est donc visible des visiteurs
// anonymes en 5 minutes au plus ; chaque déploiement vide le cache. Les
// réponses avec un Set-Cookie ne sont jamais mises en cache par Vercel.
const PUBLIC_CDN_CACHE = "max-age=300, stale-while-revalidate=3600";

const PRIVATE_PREFIXES = [
  "/dashboard", "/admin", "/messages", "/favoris", "/login", "/signup",
  "/forgot-password", "/reset-password", "/avis", "/auth",
];

function isPublicCacheable(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  // Navigations internes de Next (charges RSC) : propres à l'état du routeur
  if (request.nextUrl.searchParams.has("_rsc")) return false;
  if (request.nextUrl.searchParams.has("preview")) return false;
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (hasSession) return false;
  const path = request.nextUrl.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  return !PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt|json|ico|webmanifest)$).*)",
  ],
};
