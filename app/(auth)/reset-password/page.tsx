import ResetPasswordClient from "./ResetPasswordForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

// Métadonnées complètes ici (pas dans un layout de app/(auth)) : /reset-password et /en/reset-password
// sont servies par app/[locale]/reset-password/page.tsx, qui ré-exporte cette page —
// un layout placé sous app/(auth) ne s'applique jamais à ces routes.
export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  const title = isEn ? "Reset password" : "Réinitialiser le mot de passe";
  const description = isEn
    ? "Choose a new password for your Kabanalouer account."
    : "Choisissez un nouveau mot de passe pour votre compte Kabanalouer.";
  const canonical = isEn ? "/en/reset-password" : "/reset-password";
  return {
    title,
    description,
    // Page de compte sans valeur dans les résultats de recherche
    robots: { index: false, follow: false },
    alternates: {
      canonical,
      languages: { fr: "/reset-password", en: "/en/reset-password", "x-default": "/reset-password" },
    },
    openGraph: {
      title: `${title} | Kabanalouer`,
      description,
      url: canonical,
      locale: isEn ? "en_CA" : "fr_CA",
    },
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
