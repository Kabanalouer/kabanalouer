import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kabanalouer — Chalets au Québec",
  description:
    "Découvrez les plus beaux chalets du Québec. Contactez directement les propriétaires, sans frais de service.",
  keywords: ["chalet", "Québec", "location", "vacances", "nature"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
