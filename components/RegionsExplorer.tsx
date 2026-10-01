import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { REGIONS } from "@/lib/regions";

// Accueil : « Explorer par région », seulement les régions qui ont au moins un
// chalet publié (jamais de lien vers une page vide). Maillage interne vers les
// pages région pour le SEO/GEO, en remplacement du lien de pied de page masqué.
export default async function RegionsExplorer() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const { data } = await supabase.from("listings").select("region").eq("is_published", true);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const r = row.region as string | null;
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const regions = REGIONS
    .filter((r) => (counts.get(r.dbValue) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.dbValue) ?? 0) - (counts.get(a.dbValue) ?? 0));
  if (regions.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
      <h2 className="text-3xl font-bold text-charcoal-800 tracking-[-0.03em] leading-snug mb-8">
        {isEn ? "Explore by region" : "Explorer par région"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {regions.map((r) => {
          const n = counts.get(r.dbValue) ?? 0;
          const name = isEn ? r.nameEn : r.name;
          return (
            <Link
              key={r.slug}
              href={isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`}
              className="group relative block aspect-[4/3] rounded-2xl overflow-hidden"
            >
              <Image src={r.heroImage} alt={isEn ? `Cabin rentals in ${name}` : `Location de chalet ${r.locative}`} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
              <span className="absolute left-4 bottom-4 right-4 text-white">
                <span className="block text-heading-3 font-bold">{name}</span>
                <span className="block text-sm text-white/85">
                  {isEn ? `${n} cabin${n > 1 ? "s" : ""}` : `${n} chalet${n > 1 ? "s" : ""}`}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
