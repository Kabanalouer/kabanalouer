import LoginClient from "./LoginForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

// Métadonnées complètes ici (pas dans un layout de app/(auth)) : /login et /en/login
// sont servies par app/[locale]/login/page.tsx, qui ré-exporte cette page —
// un layout placé sous app/(auth) ne s'applique jamais à ces routes.
export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  const title = isEn ? "Log in" : "Se connecter";
  const description = isEn
    ? "Log in to your Kabanalouer account."
    : "Connectez-vous à votre compte Kabanalouer.";
  const canonical = isEn ? "/en/login" : "/login";
  return {
    title,
    description,
    // Page de compte sans valeur dans les résultats de recherche
    robots: { index: false, follow: false },
    alternates: {
      canonical,
      languages: { fr: "/login", en: "/en/login", "x-default": "/login" },
    },
    openGraph: {
      title: `${title} | Kabanalouer`,
      description,
      url: canonical,
      locale: isEn ? "en_CA" : "fr_CA",
    },
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
