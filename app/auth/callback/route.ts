import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const localeParam = searchParams.get("locale");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Role: JWT metadata set at signUp() for email, URL param for Google OAuth (queryParams don't survive the OAuth round-trip)
        const metaRole = user.user_metadata?.role as string | undefined;
        const urlRole = searchParams.get("role");
        const resolvedRole =
          metaRole === "host" || metaRole === "traveler" ? metaRole :
          urlRole === "host" ? "host" :
          null;

        // Language: JWT metadata for email signup, locale URL param for Google OAuth
        const lang =
          (user.user_metadata?.preferred_language as string | undefined) ??
          (localeParam === "en" ? "en" : undefined);

        if (resolvedRole) {
          await supabase.from("users").update({ role: resolvedRole }).eq("id", user.id);
        }
        if (lang === "fr" || lang === "en") {
          await supabase.from("users").update({ preferred_language: lang }).eq("id", user.id);
        }

        // Redirect hosts to their dashboard by default (unless a specific `next` was set)
        if (next === "/") {
          const isHost = resolvedRole
            ? resolvedRole === "host"
            : (await supabase.from("users").select("role").eq("id", user.id).single()).data?.role === "host";
          if (isHost) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
