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

  // If next-intl returns a redirect, pass it through immediately
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
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
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("supabase-timeout")), 2000)
      ),
    ]);
  } catch {
    // Session refresh timed out or failed — request continues without refreshing
  }

  return finalResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt|json|ico)$).*)",
  ],
};
