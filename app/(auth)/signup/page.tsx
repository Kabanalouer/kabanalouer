import SignupClient from "./SignupForm";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

// Métadonnées complètes ici (pas dans un layout de app/(auth)) : /signup et /en/signup
// sont servies par app/[locale]/signup/page.tsx, qui ré-exporte cette page —
// un layout placé sous app/(auth) ne s'applique jamais à ces routes.
export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  const title = isEn ? "Create an account" : "Créer un compte";
  const description = isEn
    ? "Join Kabanalouer for free. Find cabins in Quebec or list your property."
    : "Rejoignez Kabanalouer gratuitement. Trouvez des chalets au Québec ou affichez votre propriété.";
  const canonical = isEn ? "/en/signup" : "/signup";
  return {
    title,
    description,
    // Page de compte sans valeur dans les résultats de recherche
    robots: { index: false, follow: false },
    alternates: {
      canonical,
      languages: { fr: "/signup", en: "/en/signup", "x-default": "/signup" },
    },
    openGraph: {
      title: `${title} | Kabanalouer`,
      description,
      url: canonical,
      locale: isEn ? "en_CA" : "fr_CA",
    },
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
