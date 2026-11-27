import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { REGIONS } from "@/lib/regions";

// Tableau « Combien coûte un chalet au Québec ? » de l'accueil : prix de départ moyen par nuit, par région.
// Les prix des fiches sont des prix « à partir de » (price_low) ; il n'y a pas de prix saisonnier. Sont comptées
// les fiches publiées, hors test, avec un prix affiché (jamais « Prix sur demande »). Pour chaque région : on retire
// les 5 % de prix les plus bas et les 5 % les plus hauts (arrondi à l'inférieur : aucun retrait sous 20 fiches),
// on fait la moyenne, arrondie à 5 $ près. Seules les régions avec au moins MIN_PRICED_LISTINGS fiches avec prix
// sont affichées, de la plus chère à la moins chère, MAX_ROWS au plus.

export const MIN_PRICED_LISTINGS = 5;
export const MAX_ROWS = 7;
// Plafond d'affichage (décision de Simon, 2026-11-27) : une moyenne plus haute s'affiche à 495 $ (Québec : 645 $ calculé).
export const MAX_DISPLAYED_AVERAGE = 495;
const TRIM_SHARE = 0.05;
// Même règle que « Explorer par région » (components/RegionsExplorer.tsx) : le lien « Voir les N régions ».
const MIN_LISTINGS_PER_REGION = 3;

export interface RegionPriceRow {
  slug: string;
  slugEn: string;
  name: string;
  nameEn: string;
  average: number; // $ par nuit, arrondi à 5 $
  pricedCount: number; // fiches avec prix affiché dans la région
}

export interface RegionPriceStats {
  rows: RegionPriceRow[];
  regionsListed: number; // régions avec au moins 3 chalets publiés
  updatedAt: string; // ISO : moment du calcul (le cache dure 24 h)
}

// Moyenne tronquée, arrondie à 5 $ (exportée pour les essais).
export function trimmedAverageRounded(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b);
  const k = Math.floor(sorted.length * TRIM_SHARE);
  const kept = sorted.slice(k, sorted.length - k);
  const avg = kept.reduce((s, p) => s + p, 0) / kept.length;
  return Math.round(avg / 5) * 5;
}

async function computeRegionPriceStats(): Promise<RegionPriceStats> {
  // Client anonyme sans cookies : le résultat est le même pour tous les visiteurs (donc mis en cache).
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  // Quelques centaines de fiches publiées : une seule page de résultats suffit (limite PostgREST : 1000).
  const { data } = await supabase
    .from("listings")
    .select("region, price_low, price_on_request")
    .eq("is_published", true)
    .eq("is_test", false)
    .limit(1000);

  const prices = new Map<string, number[]>();
  const published = new Map<string, number>();
  for (const row of data ?? []) {
    const region = row.region as string | null;
    if (!region) continue;
    published.set(region, (published.get(region) ?? 0) + 1);
    const p = Number(row.price_low);
    if (row.price_on_request || !Number.isFinite(p) || p <= 0) continue;
    const list = prices.get(region) ?? [];
    list.push(p);
    prices.set(region, list);
  }

  const rows: RegionPriceRow[] = [];
  for (const r of REGIONS) {
    const list = prices.get(r.dbValue);
    if (!list || list.length < MIN_PRICED_LISTINGS) continue;
    rows.push({ slug: r.slug, slugEn: r.slugEn, name: r.name, nameEn: r.nameEn, average: Math.min(trimmedAverageRounded(list), MAX_DISPLAYED_AVERAGE), pricedCount: list.length });
  }
  rows.sort((a, b) => b.average - a.average);

  const regionsListed = REGIONS.filter((r) => (published.get(r.dbValue) ?? 0) >= MIN_LISTINGS_PER_REGION).length;
  return { rows: rows.slice(0, MAX_ROWS), regionsListed, updatedAt: new Date().toISOString() };
}

// Recalculé au plus une fois par jour (revalidate: 86400), jamais à chaque visite.
export const getRegionPriceStats = unstable_cache(computeRegionPriceStats, ["region-price-stats-v2"], { revalidate: 86400 });
