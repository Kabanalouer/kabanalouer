import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { claimTravelerWelcomeSlot, sendWelcomeTravelerEmail } from "@/lib/emails/welcomeTraveler";
import { localePath } from "@/lib/localePath";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const localeParam = searchParams.get("locale");
  // Langue de la page d'où vient l'utilisateur (LoginForm/SignupForm ajoutent
  // ?locale=en) — détermine la destination par défaut, pour qu'un visiteur
  // anglais ne retombe jamais sur l'accueil ou le dashboard en français.
  const locale = localeParam === "en" ? "en" : "fr";
  const defaultHome = locale === "en" ? "/en" : "/";
  const nextParam = searchParams.get("next");
  // Chemin relatif seulement ("//evil.com" serait une redirection ouverte)
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam === "/en/" ? "/en" : nextParam
      : defaultHome;

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
        // Le middleware lit user_metadata.preferred_language (pas la table users)
        // pour la redirection de langue de l'espace connecté — sans ça, un nouveau
        // compte Google créé depuis /en n'aurait aucune préférence côté session.
        if (!user.user_metadata?.preferred_language && lang === "en") {
          const { error: metaError } = await supabase.auth.updateUser({ data: { preferred_language: lang } });
          if (metaError) console.error("auth/callback: échec mise à jour user_metadata.preferred_language", metaError);
        }

        // Google OAuth n'a pas d'étape de confirmation email — le compte est actif
        // immédiatement ici. La garde (role = 'traveler' AND welcome_email_sent = false)
        // vit dans la requête elle-même : pas un traveler ou déjà envoyé → no-op silencieux.
        if (user.email) {
          const claimed = await claimTravelerWelcomeSlot(supabase, user.id);
          if (claimed) {
            const { error: emailError } = await sendWelcomeTravelerEmail({
              email: user.email,
              preferredLanguage: claimed.preferred_language === "en" ? "en" : "fr",
              firstName: claimed.name?.trim().split(/\s+/)[0],
            });
            if (emailError) {
              console.error("auth/callback: échec envoi email de bienvenue voyageur", emailError);
            }
          }
        }

        // Redirect hosts to their dashboard by default (unless a specific `next` was set)
        if (next === defaultHome) {
          const isHost = resolvedRole
            ? resolvedRole === "host"
            : (await supabase.from("users").select("role").eq("id", user.id).single()).data?.role === "host";
          if (isHost) {
            return NextResponse.redirect(`${origin}${localePath("/dashboard", locale)}`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${defaultHome}`);
}
