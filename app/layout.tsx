import type { Metadata } from "next";
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
      ? "Discover hundreds of cabins for rent in Quebec. Contact owners directly, no service fees."
      : "Découvrez des centaines de chalets à louer au Québec. Contact direct avec les propriétaires, aucun frais de service.",
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
  };
}

function organizationJsonLd(isEn: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kabanalouer",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-mark.svg`,
    description: isEn
      ? "Kabanalouer is a cabin rental marketplace in Quebec — contact owners directly, no service fees for travellers."
      : "Kabanalouer est une marketplace de location de chalets au Québec — contact direct avec les propriétaires, aucun frais de service pour les voyageurs.",
  };
}

// Pas de potentialAction/SearchAction : /chalets filtre par région/ville/capacité,
// il n'y a pas de recherche plein texte à laquelle brancher un paramètre {search_term_string}
// (Google exige que l'action déclarée fonctionne réellement).
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kabanalouer",
  url: SITE_URL,
};

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(locale === "en")) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
