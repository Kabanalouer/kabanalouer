import { ORGANIZATION_ID, WEBSITE_ID } from "@/lib/siteSchema";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SITE_URL } from "@/lib/siteUrl";
import GoogleAnalytics from "@/components/GoogleAnalytics";
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

// viewport-fit=cover : sans lui, env(safe-area-inset-*) vaut 0 sur iPhone
// (barre d'accueil, encoche) — les marges de sécurité des éléments fixés en
// bas (barre de la fiche, galerie, panneaux) n'auraient aucun effet.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Couleur de la barre d'état/du navigateur (PWA installée, Android Chrome)
  themeColor: "#636e40",
};

export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: isEn
        ? "Kabanalouer — Cabin rentals in Quebec"
        : "Kabanalouer — Location de chalets au Québec",
      template: "%s | Kabanalouer",
    },
    description: isEn
      ? "Cabins for rent in Quebec, in direct contact with the owners. No service fees for travellers."
      : "Chalets à louer au Québec, en contact direct avec les propriétaires. Aucuns frais de service pour les voyageurs.",
    keywords: isEn
      ? ["cabin", "Quebec", "rental", "vacation", "nature", "Laurentians", "Charlevoix", "Eastern Townships"]
      : ["chalet", "Québec", "location", "vacances", "nature", "Laurentides", "Charlevoix", "Estrie"],
    openGraph: {
      siteName: "Kabanalouer",
      locale: isEn ? "en_CA" : "fr_CA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      ],
      apple: "/apple-touch-icon.png",
    },
    // Ouverture en plein écran depuis l'écran d'accueil iPhone (requis pour Web Push sur iOS)
    appleWebApp: {
      capable: true,
      title: "Kabanalouer",
      statusBarStyle: "default",
    },
  };
}

// Graphe unique Organization + WebSite, émis une seule fois pour tout le site
// (@id dans lib/siteSchema.ts). Pas de potentialAction/SearchAction :
// /chalets filtre par région/ville/capacité, il n'y a pas de recherche plein
// texte à laquelle brancher un paramètre {search_term_string}.
function siteGraphJsonLd(isEn: boolean) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Kabanalouer",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-mark.png`, width: 512, height: 512 },
        description: isEn
          ? "Kabanalouer is a cabin rental marketplace in Quebec — contact owners directly, no service fees for travellers."
          : "Kabanalouer est une marketplace de location de chalets au Québec — contact direct avec les propriétaires, aucun frais de service pour les voyageurs.",
        areaServed: { "@type": "AdministrativeArea", name: isEn ? "Quebec, Canada" : "Québec, Canada" },
        foundingDate: "2026",
        founder: { "@type": "Person", name: "Simon Lemay" },
        email: "info@kabanalouer.ca",
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: "Kabanalouer",
        url: SITE_URL,
        inLanguage: isEn ? "en-CA" : "fr-CA",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang={locale} className={`h-full ${jakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col">
        {gaMeasurementId && <GoogleAnalytics measurementId={gaMeasurementId} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraphJsonLd(locale === "en")) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
