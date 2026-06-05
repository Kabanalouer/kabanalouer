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
          <div
            className="relative overflow-hidden rounded-2xl mb-12"
            style={{ height: 280 }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('/images/cover-regions.jpg')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-14">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 max-w-md leading-tight">
                Explorez les régions du Québec
              </h1>
              <p className="text-white/80 text-base md:text-lg max-w-sm">
                Des chalets dans les plus beaux coins de la province
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
                        {count} chalet{count > 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-charcoal-400 mt-0.5">Bientôt disponible</p>
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

        {/* ── CTA ── */}
        <section className="bg-primary py-16 mt-8">
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
      </main>

      <Footer />
    </div>
  );
}
