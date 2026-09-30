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
  const canonical = isEn ? "/en/owner-faq" : "/faq-hotes";
  const title = isEn ? "Owner FAQ" : "FAQ proprios";
  const description = isEn
    ? "All answers to your questions about listing your cabin on Kabanalouer."
    : "Toutes les réponses à vos questions sur la publication de votre chalet sur Kabanalouer.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/faq-hotes", en: "/en/owner-faq", "x-default": "/faq-hotes" },
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

export default async function FaqHotesPage() {
  const [t, locale] = await Promise.all([getTranslations("faqHotes"), getLocale()]);
  // Mêmes questions et réponses que la FAQ visible (clés faqHotes.*)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (
      [
        ["s1q1", "s1a1"],
        ["s1q2", "s1a2"],
        ["s1q3", "s1a3"],
        ["s2q1", "s2a1"],
        ["s3q2", "s3a2"],
        ["s5q1", "s5a1"],
        ["s5q2", "s5a2"],
      ] as const
    ).map(([q, a]) => ({
      "@type": "Question",
      name: t(q),
      acceptedAnswer: { "@type": "Answer", text: t(a) },
    })),
  };

  const SECTIONS = [
    {
      title: t("sec1"),
      items: [
        { q: t("s1q1"), a: t("s1a1") },
        { q: t("s1q2"), a: t("s1a2") },
        { q: t("s1q3"), a: t("s1a3") },
      ],
    },
    {
      title: t("sec2"),
      items: [
        { q: t("s2q1"), a: t("s2a1") },
        { q: t("s2q2"), a: t("s2a2") },
      ],
    },
    {
      title: t("sec3"),
      items: [
        { q: t("s3q1"), a: t("s3a1") },
        { q: t("s3q2"), a: t("s3a2") },
      ],
    },
    {
      title: t("sec4"),
      items: [
        { q: t("s4q1"), a: t("s4a1") },
        { q: t("s4q2"), a: t("s4a2") },
      ],
    },
    {
      title: t("sec5"),
      items: [
        { q: t("s5q1"), a: t("s5a1") },
        { q: t("s5q2"), a: t("s5a2") },
        { q: t("s5q3"), a: t("s5a3") },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            {t("badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 mb-5 leading-tight">
            {t("h1")}
          </h1>
          <p className="text-lg text-charcoal-500 max-w-lg mx-auto">
            {t("intro")}
          </p>
        </div>
      </section>

      {/* ── FAQ sections ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-14">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-heading-2 font-bold text-charcoal-800 mb-4 pb-3 border-b border-[#ebebeb]">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.items.map(({ q, a }) => (
                  <details
                    key={q}
                    className="group border border-[#ebebeb] rounded-2xl bg-[#F8FAF9] overflow-hidden"
                  >
                    <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-charcoal-800 text-base select-none">
                      {q}
                      <svg
                        className="w-4 h-4 text-charcoal-400 shrink-0 ml-3 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 text-base text-charcoal-500 leading-relaxed border-t border-[#ebebeb] pt-4">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#F8FAF9] border-t border-[#ebebeb] py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-charcoal-800 mb-4">
            {t("ctaTitle")}
          </h2>
          <p className="text-charcoal-500 mb-8">{t("ctaSubtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={localePath("/contact", locale)}
              className="inline-flex items-center justify-center bg-primary text-white font-bold px-8 py-4 rounded-full hover:bg-primary/90 transition-colors"
            >
              {t("ctaContact")}
            </Link>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
