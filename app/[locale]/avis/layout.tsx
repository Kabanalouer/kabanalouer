import type { Metadata } from "next";

// Formulaires d'avis à jeton personnel : jamais dans les résultats de recherche
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AvisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
