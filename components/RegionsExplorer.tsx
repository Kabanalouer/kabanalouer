import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { REGIONS } from "@/lib/regions";
import { localePath } from "@/lib/localePath";

// Accueil : « Explorer par région » (option 5a, 2026-11-27), seulement les régions qui ont au moins
// 3 chalets publiés (jamais de lien vers une page presque vide). Maillage interne vers les
// pages région pour le SEO/GEO. Masquée tant qu'il y a moins de 4 régions (choix de Simon, 2026-10-02).
// Les 8 régions qui ont le plus de chalets : 2 grandes tuiles puis 6 petites ; le lien « Voir les N régions »
// (en-tête) mène à /regions, qui les liste toutes.
const MIN_REGIONS = 4;
// Une région n'apparaît ici qu'à partir de 3 chalets publiés (choix de Simon, 2026-10-19).
const MIN_LISTINGS_PER_REGION = 3;
const VISIBLE_REGIONS = 8;
const BIG_TILES = 2;

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
    .filter((r) => (counts.get(r.dbValue) ?? 0) >= MIN_LISTINGS_PER_REGION)
    .sort((a, b) => (counts.get(b.dbValue) ?? 0) - (counts.get(a.dbValue) ?? 0));
  if (regions.length < MIN_REGIONS) return null;

  const tile = (r: (typeof regions)[number], index: number) => {
    const n = counts.get(r.dbValue) ?? 0;
    const name = isEn ? r.nameEn : r.name;
    const big = index < BIG_TILES;
    return (
      <Link
        key={r.slug}
        href={isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`}
        className={`group relative block overflow-hidden rounded-[var(--radius-xl)] bg-charcoal-100 ${
          big ? "col-span-2 aspect-[16/9] lg:col-span-3 lg:aspect-[16/10]" : "col-span-1 aspect-square sm:aspect-[4/3] lg:col-span-2"
        }`}
      >
        <Image
          src={r.heroImage}
          alt={isEn ? `Cabin rentals in ${name}` : `Location de chalet ${r.locative}`}
          fill
          sizes={big ? "(max-width:1023px) 100vw, 640px" : "(max-width:1023px) 50vw, 420px"}
          className="object-cover transition-transform duration-[360ms] ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,24,12,.82),rgba(20,24,12,0)_55%)]" aria-hidden="true" />
        <span
          className={`absolute inset-x-[22px] bottom-[18px] flex gap-[10px] text-white ${
            big ? "flex-row flex-wrap items-baseline" : "flex-col items-start sm:flex-row sm:flex-wrap sm:items-baseline"
          }`}
        >
          <span
            className={`font-extrabold leading-none tracking-[-0.045em] ${
              big ? "text-[40px] sm:text-[52px] lg:text-[64px]" : "text-[28px] sm:text-4xl lg:text-[40px]"
            }`}
          >
            {n}
            <span className="sr-only">{isEn ? (n > 1 ? " cabins" : " cabin") : n > 1 ? " chalets" : " chalet"}</span>
          </span>
          <span className={`font-bold text-balance ${big ? "text-lg lg:text-xl" : "text-sm sm:text-base"}`}>{name}</span>
        </span>
      </Link>
    );
  };

  return (
    <section className="w-full overflow-x-clip bg-white py-[clamp(64px,8vw,96px)]">
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,56px)]">
        <div className="mb-[18px] sm:mb-6 flex flex-wrap items-end [align-items:last_baseline] justify-between gap-x-4 gap-y-2">
          <h2 className="text-[length:var(--fs-display)] font-extrabold tracking-[-0.04em] leading-none text-charcoal-800">
            {isEn ? "Explore by region" : "Explorer par région"}
          </h2>
          <Link href={localePath("/regions", locale)} className="whitespace-nowrap text-[15px] font-bold text-link hover:text-action-hover transition-colors">
            {isEn ? `See all ${regions.length} regions →` : `Voir les ${regions.length} régions →`}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-[10px] sm:gap-[14px] lg:grid-cols-6 lg:gap-4">{regions.slice(0, VISIBLE_REGIONS).map(tile)}</div>
      </div>
    </section>
  );
}
