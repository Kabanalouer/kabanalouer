import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

const APP_URL = "https://kabanalouer.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Kabanalouer — Location de chalets au Québec",
    template: "%s | Kabanalouer",
  },
  description:
    "Découvrez des centaines de chalets à louer au Québec. Contact direct avec les propriétaires, aucun frais de service.",
  keywords: ["chalet", "Québec", "location", "vacances", "nature", "Laurentides", "Charlevoix", "Estrie"],
  openGraph: {
    siteName: "Kabanalouer",
    locale: "fr_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`h-full ${jakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
