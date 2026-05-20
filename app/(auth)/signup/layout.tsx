import type { Metadata } from "next";

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
  return <>{children}</>;
}
