import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OwnerCTA from "@/components/OwnerCTA";
import { createClient } from "@/lib/supabase/server";
import { REGIONS } from "@/lib/regions";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const canonical = isEn ? "/en/regions" : "/regions";
  const title = isEn ? "All Regions — Kabanalouer" : "Toutes les régions — Kabanalouer";
  const description = isEn
    ? "Explore cabin rentals across all Quebec regions. Laurentians, Charlevoix, Eastern Townships and more. Direct contact with owners."
    : "Explorez nos chalets à louer dans toutes les régions du Québec. Laurentides, Charlevoix, Cantons-de-l'Est et plus. Contact direct avec les propriétaires.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/regions", en: "/en/regions", "x-default": "/regions" },
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

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
    {
      "@type": "ListItem",
      position: 2,
      name: "Régions",
      item: `${SITE_URL}/regions`,
    },
  ],
};

export default async function RegionsPage() {
  const [supabase, t] = await Promise.all([createClient(), getTranslations("regions")]);

  const { data } = await supabase
    .from("listings")
    .select("region")
    .eq("is_published", true);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row.region as string;
    if (r) counts[r] = (counts[r] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Banner ── */}
          <div className="relative overflow-hidden rounded-2xl h-[280px] mb-12">
            <img
              src="/images/cover-region.jpg"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-14">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 max-w-md leading-tight">
                {t("bannerTitle")}
              </h1>
              <p className="text-white/80 text-base md:text-lg max-w-sm">
                {t("bannerSubtitle")}
              </p>
            </div>
          </div>

          {/* ── Region grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...REGIONS].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((region) => {
              const count = counts[region.dbValue] ?? 0;
              const href =
                count > 0
                  ? `/chalets/${region.slug}`
                  : `/chalets?region=${encodeURIComponent(region.dbValue)}`;

              return (
                <Link
                  key={region.slug}
                  href={href}
                  className="group flex items-center justify-between p-4 rounded-xl border border-[#ebebeb] hover:bg-charcoal-50 hover:border-charcoal-200 transition-colors"
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-[15px] font-medium text-charcoal-800 truncate">
                      {region.name}
                    </p>
                    {count > 0 ? (
                      <p className="text-sm text-charcoal-400 mt-0.5">
                        {t("cabinCount", { count })}
                      </p>
                    ) : (
                      <p className="text-sm text-charcoal-400 mt-0.5">{t("comingSoon")}</p>
                    )}
                  </div>
                  <svg
                    className="w-4 h-4 text-charcoal-400 group-hover:text-primary transition-colors flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>

        <OwnerCTA className="mt-8" />
      </main>

      <Footer />
    </div>
  );
}
