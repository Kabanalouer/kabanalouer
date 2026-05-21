import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { REGIONS } from "@/lib/regions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chalets à louer par région au Québec",
  description:
    "Explorez nos chalets à louer dans toutes les régions du Québec. Laurentides, Charlevoix, Cantons-de-l'Est et plus. Contact direct avec les propriétaires.",
  alternates: { canonical: "/regions" },
  openGraph: {
    title: "Chalets à louer par région au Québec | Kabanalouer",
    description:
      "Explorez nos chalets à louer dans toutes les régions du Québec. Contact direct avec les propriétaires, aucun frais de service.",
    url: "/regions",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://kabanalouer.vercel.app/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Régions",
      item: "https://kabanalouer.vercel.app/regions",
    },
  ],
};

export default async function RegionsPage() {
  const supabase = await createClient();

  // Fetch all published region values in one query, then count in JS
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

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-[#ebebeb] py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            14 régions du Québec
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal-800 mb-4 leading-tight">
            Explorez par région
          </h1>
          <p className="text-lg text-charcoal-500 max-w-md mx-auto">
            Trouvez votre chalet idéal dans toutes les régions du Québec
          </p>
        </div>
      </section>

      {/* ── Region grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {REGIONS.map((region) => {
            const count = counts[region.dbValue] ?? 0;
            const href =
              count > 0
                ? `/chalets/${region.slug}`
                : `/chalets?region=${encodeURIComponent(region.dbValue)}`;

            return (
              <Link
                key={region.slug}
                href={href}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] block"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${region.heroImage}')` }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <h2 className="text-white font-bold text-lg leading-tight mb-1">
                    {region.name}
                  </h2>
                  {count > 0 ? (
                    <p className="text-white/80 text-sm">
                      {count} chalet{count > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-white/60 text-sm italic">Bientôt disponible</p>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary py-16">
        <div className="max-w-2xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Vous êtes propriétaire ?</h2>
          <p className="text-white/80 text-lg mb-8">
            Affichez votre chalet sur Kabanalouer et rejoignez des centaines de propriétaires
            québécois.
          </p>
          <Link
            href="/devenir-hote"
            className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
          >
            Inscrire mon chalet →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
