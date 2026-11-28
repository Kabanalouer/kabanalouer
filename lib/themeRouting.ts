import type { Metadata } from "next";
import { THEMES, getActiveTheme, isThemeContentReady } from "@/content/themes";
import type { ThemeContent } from "@/content/themes/types";
import { getRegionByDbValue, getRegionBySlug, type RegionConfig } from "@/lib/regions";
import { slugify } from "@/lib/slugify";
import { SITE_URL } from "@/lib/siteUrl";
import { fr, frInt } from "@/lib/frTypography";
import { getThemeData } from "@/lib/themeData";
import { MIN_LISTINGS_CITY_INDEXED, MIN_LISTINGS_INDEXED, computeStats, inScope, yearRoundKnownEnough, type ThemeRow, type ThemeStats } from "@/lib/themeStats";

// Pages thème (gabarit ThemeLandingPage) : /chalets/{thème}, /chalets/{thème}/{région}, /chalets/{thème}/{région}/{ville}.
// Français seulement : l'anglais garde le gabarit actuel.

export interface ThemeTarget {
  theme: ThemeContent;
  region?: RegionConfig;
  city?: string; // nom officiel de la ville
}

export const themePath = (t: ThemeTarget): string => {
  const base = `/chalets/${t.theme.slug}`;
  if (!t.region) return base;
  return `${base}/${t.region.slug}${t.city ? `/${slugify(t.city)}` : ""}`;
};

// « au Québec » · « dans les Laurentides » · « à Saint-Sauveur »
export const placeOf = (t: ThemeTarget): string => (t.city ? `à ${t.city}` : t.region ? t.region.locative : "au Québec");

export interface ThemeScope {
  target: ThemeTarget;
  rows: ThemeRow[]; // toutes les fiches du thème (province)
  scoped: ThemeRow[]; // fiches du lieu de la page
  stats: ThemeStats; // statistiques du lieu de la page
  national: ThemeStats;
  regionStats?: ThemeStats; // statistiques de la région (page ville)
}

// Segments de l'adresse → page thème. null = ce n'est pas une page thème activée (le reste du site s'en occupe).
export async function resolveThemeTarget(segments: string[]): Promise<ThemeScope | "not-found" | null> {
  const theme = getActiveTheme(segments[0]);
  if (!theme) return null;
  const { rows, updatedAt } = await getThemeData(theme.slug);
  const national = computeStats(rows, updatedAt);
  if (segments.length === 1) return { target: { theme }, rows, scoped: rows, stats: national, national };

  const region = getRegionBySlug(segments[1]);
  if (!region) return "not-found";
  const regionRows = inScope(rows, region.dbValue);
  if (regionRows.length === 0) return "not-found";
  const regionStats = computeStats(rows, updatedAt, region.dbValue);
  if (segments.length === 2) {
    return { target: { theme, region }, rows, scoped: regionRows, stats: regionStats, national };
  }
  if (segments.length !== 3) return "not-found";

  const city = [...new Set(regionRows.map((r) => r.city).filter((c): c is string => !!c))].find((c) => slugify(c) === segments[2]);
  if (!city) return "not-found";
  const cityRows = inScope(rows, region.dbValue, city);
  return {
    target: { theme, region, city },
    rows,
    scoped: cityRows,
    stats: computeStats(rows, updatedAt, region.dbValue, city),
    national,
    regionStats,
  };
}

// Index et canonical : page nationale toujours indexée ; région indexée à 3 fiches ou plus ; ville indexée à 3 fiches
// ou plus et seulement si elle ne reprend pas toute la région (même règle que lib/comboLandings.ts).
export function indexingOf(scope: ThemeScope): { index: boolean; canonicalPath: string } {
  const { target, stats, regionStats } = scope;
  if (!target.region) return { index: true, canonicalPath: themePath(target) };
  if (!target.city) return { index: stats.count >= MIN_LISTINGS_INDEXED, canonicalPath: themePath(target) };
  const redundant = regionStats ? stats.count === regionStats.count : false;
  if (stats.count >= MIN_LISTINGS_CITY_INDEXED && !redundant) return { index: true, canonicalPath: themePath(target) };
  return { index: false, canonicalPath: themePath({ theme: target.theme, region: target.region }) };
}

export function buildThemeMetadata(scope: ThemeScope): Metadata {
  const { target, stats } = scope;
  const { theme } = target;
  const place = placeOf(target);
  const n = stats.count;
  const prix = stats.priceMin !== null ? `, à partir de ${frInt(stats.priceMin)} $/nuit` : "";
  // Le site ajoute déjà « | Kabanalouer » aux titres (gabarit du layout) : on ne le répète pas dans `title`
  const title = fr(
    theme.meta
      ? `${target.region ? theme.meta.titleBase : (theme.meta.titleBaseNational ?? theme.meta.titleBase)} ${place} · ${n} chalets`
      : target.region ? `Chalet à louer ${theme.label} ${place} · ${n} chalets` : `${theme.h1Base} au Québec · ${n} chalets`
  );
  const ouvertAnnee = yearRoundKnownEnough(stats)
    ? ` ${stats.spa.annee} ${stats.spa.annee === 1 ? "a un spa ouvert" : "ont un spa ouvert"} à l'année.`
    : "";
  const d = stats.dog;
  const dogPieces = [
    d.feeKnown >= 0.3 * stats.count && d.gratuit > 0 ? `${d.gratuit} sans frais pour le chien` : "",
    d.sizeKnown >= 0.3 * stats.count && d.toutesTailles > 0 ? `${d.toutesTailles} ${d.toutesTailles === 1 ? "accepte" : "acceptent"} les gros chiens` : "",
  ].filter(Boolean);
  const chiensInfos = theme.slug === "chiens-acceptes" && dogPieces.length > 0 ? ` ${dogPieces.join(", ")}.` : "";
  const description = fr(
    theme.meta
      ? theme.meta.description
          .replace("{N}", String(n))
          .replace("{lieu}", place)
          .replace("{prix}", prix)
          .replace("{ouvertAnnee}", ouvertAnnee)
          .replace("{chiensInfos}", chiensInfos)
      : `${n} ${theme.labelPlural} à louer ${place}${prix}. Lac, rivière ou fleuve : écrivez directement au propriétaire, sans frais de service.`
  );
  const { index, canonicalPath } = indexingOf(scope);
  const url = `${SITE_URL}${canonicalPath}`;
  return {
    title,
    description,
    ...(index ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical: canonicalPath },
    openGraph: { title: `${title} | Kabanalouer`, description, url, siteName: "Kabanalouer", locale: "fr_CA", type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | Kabanalouer`, description },
  };
}

// Pages ville indexables de tous les thèmes actifs (sitemap, llms.txt) : même règle que `indexingOf`, mêmes données.
export async function indexableThemeCities(): Promise<{ target: ThemeTarget; count: number }[]> {
  const out: { target: ThemeTarget; count: number }[] = [];
  for (const theme of THEMES.filter(isThemeContentReady)) {
    const { rows, updatedAt } = await getThemeData(theme.slug);
    for (const c of computeStats(rows, updatedAt).byCity) {
      const region = getRegionByDbValue(c.region);
      if (!region) continue;
      const regionCount = inScope(rows, region.dbValue).length;
      if (c.count >= MIN_LISTINGS_CITY_INDEXED && c.count !== regionCount) out.push({ target: { theme, region, city: c.city }, count: c.count });
    }
  }
  return out;
}
