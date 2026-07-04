import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonical = isEn ? "/en/tarifs" : "/tarifs";
  const title = isEn ? "Pricing" : "Tarifs et abonnement";
  const description = isEn
    ? "One simple, transparent annual subscription. $299/year per cabin. Free offer for the first 50 owners."
    : "Un seul abonnement annuel simple et transparent. 299 $/an par chalet. Offre gratuite pour les 50 premiers propriétaires.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/tarifs", en: "/en/tarifs", "x-default": "/tarifs" },
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

const FREE_LAUNCH_LIMIT = 50;

async function getActiveSubscriptionCount(): Promise<number> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { count } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  return count ?? 0;
}

export default async function TarifsPage() {
  const [usedSlots, t] = await Promise.all([
    getActiveSubscriptionCount(),
    getTranslations("tarifs"),
  ]);
  const remaining = Math.max(0, FREE_LAUNCH_LIMIT - usedSlots);
  const hasOffer = remaining > 0;

  const INCLUDED = [
    t("f0"), t("f1"), t("f2"), t("f3"), t("f4"), t("f5"), t("f6"), t("f7"), t("f8"),
  ];

  const COMPARISON = [
    { feature: t("compF0"), kbl: "299 $/an", airbnb: t("compAirbnb0") },
    { feature: t("compF1"), kbl: "0 %", airbnb: t("compAirbnb1") },
    { feature: t("compF2"), kbl: "0 %", airbnb: t("compAirbnb2") },
    { feature: t("compF3"), kbl: true as const, airbnb: t("compAirbnb3") },
    { feature: t("compF4"), kbl: true as const, airbnb: false as const },
  ];

  const FAQ = [
    { q: t("faq0Q"), a: t("faq0A") },
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-12 md:py-20">
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

      {/* ── Pricing card ── */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <div className="bg-[#F8FAF9] rounded-2xl border border-[#ebebeb] p-8">
            {hasOffer && (
              <div className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-5">
                {t("offerBadge", { remaining })}
              </div>
            )}

            <div className="mb-6">
              {hasOffer ? (
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-bold text-primary">0 $</span>
                  <div className="mb-2">
                    <p className="text-sm text-charcoal-400 line-through">299 $/an</p>
                    <p className="text-sm text-charcoal-500">{t("firstYear")}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-bold text-primary">299 $</span>
                  <span className="text-charcoal-500 mb-2">/an</span>
                </div>
              )}
              <p className="text-sm text-charcoal-400 mt-1">{t("perCabinAll")}</p>
            </div>

            <ul className="space-y-3 mb-8">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-charcoal-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={hasOffer ? "/signup?role=host" : "/devenir-hote"}
              className="w-full inline-flex items-center justify-center bg-primary text-white font-bold py-4 rounded-full hover:bg-primary/90 transition-colors text-base"
            >
              {hasOffer ? t("offerBtn") : t("registerBtn")}
            </Link>
            <p className="text-xs text-charcoal-400 text-center mt-3">
              {t("noCardRequired")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="py-12 md:py-20 bg-[#F8FAF9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-800 text-center mb-8 md:mb-10">
            {t("compTitle")}
          </h2>
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
            <div className="grid grid-cols-3 bg-charcoal-50 border-b border-[#ebebeb]">
              <div className="px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-charcoal-400 uppercase tracking-wider" />
              <div className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-primary text-center">
                Kabanalouer
              </div>
              <div className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-charcoal-500 text-center">
                Airbnb
              </div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 border-b border-[#ebebeb] ${i % 2 === 0 ? "bg-white" : "bg-charcoal-50/50"}`}
              >
                <div className="px-3 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm text-charcoal-700 font-medium leading-snug">
                  {row.feature}
                </div>
                <div className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                  {row.kbl === true ? (
                    <span className="text-primary font-bold text-base sm:text-lg">✓</span>
                  ) : (
                    <span className="text-[11px] sm:text-sm font-semibold text-primary">{row.kbl}</span>
                  )}
                </div>
                <div className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                  {row.airbnb === false ? (
                    <span className="text-red-400 text-base sm:text-lg font-bold">✗</span>
                  ) : (
                    <span className="text-[11px] sm:text-sm text-charcoal-500">{row.airbnb}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-charcoal-400 text-center mt-4">{t("compDisclaimer")}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-charcoal-800 text-center mb-8 md:mb-10">
            {t("faqTitle")}
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-[#ebebeb] rounded-2xl bg-[#F8FAF9] overflow-hidden"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-charcoal-800 text-sm select-none">
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
                <div className="px-6 pb-5 text-sm text-charcoal-500 leading-relaxed border-t border-[#ebebeb] pt-4">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary py-16">
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("ctaTitle")}</h2>
          <p className="text-white/80 text-lg mb-8">
            {hasOffer ? t("ctaOfferSubtitle", { remaining }) : t("ctaNoOfferSubtitle")}
          </p>
          <Link
            href="/signup?role=host"
            className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
          >
            {t("ctaBtn")}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
