import ForgotPasswordClient from "./ForgotPasswordForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

// Métadonnées complètes ici (pas dans un layout de app/(auth)) : /forgot-password et /en/forgot-password
// sont servies par app/[locale]/forgot-password/page.tsx, qui ré-exporte cette page —
// un layout placé sous app/(auth) ne s'applique jamais à ces routes.
export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  const title = isEn ? "Forgot password" : "Mot de passe oublié";
  const description = isEn
    ? "Reset the password for your Kabanalouer account."
    : "Réinitialisez le mot de passe de votre compte Kabanalouer.";
  const canonical = isEn ? "/en/forgot-password" : "/forgot-password";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/forgot-password", en: "/en/forgot-password", "x-default": "/forgot-password" },
    },
    openGraph: {
      title: `${title} | Kabanalouer`,
      description,
      url: canonical,
      locale: isEn ? "en_CA" : "fr_CA",
    },
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
