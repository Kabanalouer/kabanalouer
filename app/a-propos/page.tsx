import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PriceComparison from "@/components/PriceComparison";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonical = isEn ? "/en/about" : "/a-propos";
  const title = isEn ? "About" : "À propos";
  const description = isEn
    ? "Kabanalouer, made in Quebec: cabin rentals without the middleman. No commission on stays, no fees for travelers, direct contact with the owner."
    : "Kabanalouer, fait au Québec : la location de chalets sans intermédiaire. Aucune commission sur les séjours, aucuns frais pour les voyageurs, contact direct avec le proprio.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/a-propos", en: "/en/about", "x-default": "/a-propos" },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Kabanalouer",
      locale: isEn ? "en_CA" : "fr_CA",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

function organizationJsonLd(isEn: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kabanalouer",
    url: SITE_URL,
    description: isEn ? "Cabin rental marketplace in Quebec" : "Marketplace de location de chalets au Québec",
    areaServed: isEn ? "Quebec, Canada" : "Québec, Canada",
    foundingDate: "2026",
    slogan: isEn ? "The marketplace for Quebec cabins" : "La marketplace des chalets québécois",
  };
}

export default async function AProposPage() {
  const [t, locale] = await Promise.all([getTranslations("aPropos"), getLocale()]);

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(locale === "en")) }}
      />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="bg-charcoal-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            {t("badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 leading-tight text-balance">
            {t("h1")}
          </h1>
        </div>
      </section>

      {/* ── D'où vient Kabanalouer ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-charcoal-800 mb-6">{t("originTitle")}</h2>
          <div className="space-y-4 text-charcoal-600 leading-relaxed text-lg">
            <p>{t("origin1")}</p>
            <p>{t("origin2")}</p>
          </div>
        </div>
      </section>

      {/* ── Notre différence — même section que la page d'accueil ── */}
      <PriceComparison />

      {/* ── Le modèle ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-charcoal-800 mb-6">{t("modelTitle")}</h2>
          <div className="space-y-4 text-charcoal-600 leading-relaxed text-lg">
            <p>{t("model1")}</p>
            <p>{t("model2")}</p>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
