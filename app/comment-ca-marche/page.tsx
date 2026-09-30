import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PriceComparison from "@/components/PriceComparison";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { localePath } from "@/lib/localePath";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonical = isEn ? "/en/how-it-works" : "/comment-ca-marche";
  const title = isEn ? "How It Works" : "Comment ça marche";
  const description = isEn
    ? "Find and contact Quebec cabin owners directly. No service fees for travelers. 3 simple steps."
    : "Trouvez et contactez directement les propriétaires de chalets au Québec. Aucun frais de service pour les voyageurs. 3 étapes simples.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/comment-ca-marche", en: "/en/how-it-works", "x-default": "/comment-ca-marche" },
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

export default async function CommentCaMarchePage() {
  const [t, locale] = await Promise.all([getTranslations("commentCaMarche"), getLocale()]);
  // Mêmes questions et réponses que la FAQ visible (clés faq1Q…faq5A)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ([1, 2, 3, 4, 5] as const).map((i) => ({
      "@type": "Question",
      name: t(`faq${i}Q`),
      acceptedAnswer: { "@type": "Answer", text: t(`faq${i}A`) },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Notre différence — même section que la page d'accueil ── */}
      <PriceComparison />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] py-20 border-b border-[#ebebeb]">
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

      {/* ── 3 Steps ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <Step
              number={1}
              title={t("step1Title")}
              description={t("step1Desc")}
              action={{ label: t("step1Action"), href: localePath("/chalets", locale) }}
            />
            <Step number={2} title={t("step2Title")} description={t("step2Desc")} />
            <Step number={3} title={t("step3Title")} description={t("step3Desc")} />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-charcoal-800 text-center mb-12">
            {t("faqTitle")}
          </h2>
          <div className="space-y-4">
            <FaqItem question={t("faq1Q")} answer={t("faq1A")} />
            <FaqItem question={t("faq2Q")} answer={t("faq2A")} />
            <FaqItem question={t("faq3Q")} answer={t("faq3A")} />
            <FaqItem question={t("faq4Q")} answer={t("faq4A")} />
            <FaqItem question={t("faq5Q")} answer={t("faq5A")} />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-primary py-20">
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("ctaTitle")}</h2>
          <p className="text-white/80 text-lg mb-10">{t("ctaSubtitle")}</p>
          <Link
            href={localePath("/chalets", locale)}
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
          >
            {t("ctaBtn")}
          </Link>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}

function Step({
  number,
  title,
  description,
  action,
}: {
  number: number;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex gap-6 md:gap-10 items-start">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-primary">{number}</span>
        </div>
        {number < 3 && <div className="w-0.5 h-8 bg-primary/20 mt-3" />}
      </div>
      <div className="flex-1 pb-8">
        <h3 className="text-heading-3 font-bold text-charcoal-800 mb-3">{title}</h3>
        <p className="text-charcoal-500 leading-relaxed max-w-xl">{description}</p>
        {action && (
          <Link
            href={action.href}
            className={`inline-flex items-center gap-1.5 mt-4 text-sm ${TEXT_LINK_CLASSNAME}`}
          >
            {action.label} →
          </Link>
        )}
      </div>
    </div>
  );
}


function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border border-[#ebebeb] rounded-2xl p-6 bg-[#F8FAF9]">
      <p className="text-heading-3 font-semibold text-charcoal-800 mb-2">{question}</p>
      <p className="text-charcoal-500 text-base leading-relaxed">{answer}</p>
    </div>
  );
}
