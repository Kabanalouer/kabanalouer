import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { localePath } from "@/lib/localePath";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonical = isEn ? "/en/a-propos" : "/a-propos";
  const title = isEn ? "About" : "À propos";
  const description = isEn
    ? "Kabanalouer is the leading marketplace for cabin rentals in Quebec. Our mission: connecting travelers and owners without intermediaries."
    : "Kabanalouer est la marketplace de référence pour la location de chalets au Québec. Notre mission : connecter voyageurs et propriétaires sans intermédiaire.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/a-propos", en: "/en/a-propos", "x-default": "/a-propos" },
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kabanalouer",
  url: SITE_URL,
  description: "Marketplace de location de chalets au Québec",
  areaServed: "Québec, Canada",
  foundingDate: "2026",
  slogan: "La marketplace des chalets québécois",
};

export default async function AProposPage() {
  const [t, locale] = await Promise.all([getTranslations("aPropos"), getLocale()]);

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            {t("badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 mb-5 leading-tight">
            {t("h1")}
          </h1>
          <p className="text-lg text-charcoal-500 max-w-lg mx-auto leading-relaxed">
            {t("intro")}
          </p>
        </div>
      </section>

      {/* ── Notre histoire ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-charcoal-800 mb-6">{t("whyTitle")}</h2>
          <div className="space-y-4 text-charcoal-600 leading-relaxed text-lg">
            <p>{t("story1")}</p>
            <p>{t("story2")}</p>
            <p>{t("story3")}</p>
          </div>
        </div>
      </section>

      {/* ── Nos valeurs ── */}
      <section className="py-20 bg-[#F8FAF9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-charcoal-800 text-center mb-12">{t("valuesTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard icon={<LeafIcon />} title={t("val1Title")} description={t("val1Desc")} />
            <ValueCard icon={<UsersIcon />} title={t("val2Title")} description={t("val2Desc")} />
            <ValueCard icon={<ShieldIcon />} title={t("val3Title")} description={t("val3Desc")} />
          </div>
        </div>
      </section>

      {/* ── En chiffres ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-charcoal-800 text-center mb-12">
            {t("statsTitle")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat value={t("stat1Value")} label={t("stat1Label")} />
            <Stat value={t("stat2Value")} label={t("stat2Label")} />
            <Stat value={t("stat3Value")} label={t("stat3Label")} />
            <Stat value={t("stat4Value")} label={t("stat4Label")} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("ctaTitle")}</h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {t("ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={localePath("/chalets", locale)}
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
            >
              {t("ctaExploreCabins")}
            </Link>
            <Link
              href={localePath("/devenir-hote", locale)}
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/20 transition-colors text-lg"
            >
              {t("ctaListCabin")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#ebebeb]">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-charcoal-800 text-lg mb-2">{title}</h3>
      <p className="text-charcoal-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6 bg-[#F8FAF9] rounded-2xl border border-[#ebebeb]">
      <div className="text-3xl font-bold text-primary mb-2">{value}</div>
      <div className="text-sm text-charcoal-500 leading-snug">{label}</div>
    </div>
  );
}

function LeafIcon() {
  return (
    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
