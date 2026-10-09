import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PriceComparison from "@/components/PriceComparison";
import ExploreCabinsCta from "@/components/ExploreCabinsCta";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { ORGANIZATION_ID, WEBSITE_ID } from "@/lib/siteSchema";

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

// Date de la dernière révision du texte de la page (à changer quand le texte change)
const ABOUT_UPDATED_ON = "2026-10-08";

// L'Organization elle-même est déclarée une seule fois dans app/layout.tsx :
// la page À propos s'y rattache par son @id.
function aboutPageJsonLd(isEn: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: `${SITE_URL}${isEn ? "/en/about" : "/a-propos"}`,
    name: isEn ? "About Kabanalouer" : "À propos de Kabanalouer",
    inLanguage: isEn ? "en-CA" : "fr-CA",
    about: { "@id": ORGANIZATION_ID },
    dateModified: ABOUT_UPDATED_ON,
    isPartOf: { "@id": WEBSITE_ID },
  };
}

export default async function AProposPage() {
  const [t, locale] = await Promise.all([getTranslations("aPropos"), getLocale()]);

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd(locale === "en")) }}
      />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="bg-charcoal-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            {t("badgeMadeWith")}
            <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {t("badgeInQuebec")}
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
          <p className="mt-8 text-sm text-charcoal-400">
            {t("updatedOn", { date: new Date(`${ABOUT_UPDATED_ON}T12:00:00`).toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
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

      {/* ── Bandeau final — même que Comment ça marche ── */}
      <ExploreCabinsCta />

      </main>

      <Footer />
    </div>
  );
}
