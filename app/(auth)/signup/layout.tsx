import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoignez Kabanalouer gratuitement. Trouvez des chalets au Québec ou affichez votre propriété.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Créer un compte | Kabanalouer",
    description: "Rejoignez Kabanalouer gratuitement. Trouvez des chalets au Québec ou affichez votre propriété.",
    url: "/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      {children}
    </>
  );
}
