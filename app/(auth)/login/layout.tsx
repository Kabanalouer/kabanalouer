import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte Kabanalouer.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Connexion | Kabanalouer",
    description: "Connectez-vous à votre compte Kabanalouer.",
    url: "/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
