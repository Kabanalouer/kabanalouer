import { getRegionByDbValue } from "@/lib/regions";
import { isKnownMunicipality } from "@/lib/municipalities";

// Calculs des pages thème (gabarit ThemeLandingPage) : fonctions pures sur des lignes déjà lues (voir lib/themeData.ts
// pour la lecture en base et le cache de 24 h). Aucune donnée inventée : tout vient des fiches publiées.

// Seuil d'une page région ou ville indexée (même règle que lib/comboLandings.ts)
export const MIN_LISTINGS_INDEXED = 3;
// Une sous-catégorie sous ce nombre de fiches n'a pas de pastille
export const MIN_LISTINGS_CHIP = 5;
export const GRID_SIZE = 24;
export const MAX_PER_OWNER = 2;
const TRIM_SHARE = 0.05;

// Équipements dont l'un suffit pour appartenir au thème (même règle que lib/amenityLandings.ts)
export const THEME_AMENITY_IDS: Record<string, string[]> = {
  "bord-de-l-eau": ["bord-eau", "acces-lac"],
};

export interface ThemeRow {
  id: string;
  title: string;
  titleEn: string | null;
  region: string; // dbValue
  city: string | null;
  price: number;
  priceOnRequest: boolean;
  capacity: number;
  bedrooms: number;
  photos: string[];
  listingNumber: number | null;
  customSlug: string | null;
  lat: number | null;
  lng: number | null;
  rank: number; // unclaimed_rank : revendiquées d'abord
  score: number;
  createdAt: string;
  // Exploitant : nom du site de chalets, sinon courriel au dossier, sinon propriétaire
  ownerKey: string;
  // Thème bord de l'eau
  direct: boolean;
  lake: boolean;
  lakeAccess: "prive" | "public" | null;
  beach: boolean;
  boats: boolean;
  dogs: boolean;
}

export type AccessKey = "direct" | "lake" | "beach" | "boats";
export const ACCESS_KEYS: AccessKey[] = ["direct", "lake", "beach", "boats"];

export function hasDisplayedPrice(r: ThemeRow): boolean {
  return !r.priceOnRequest && Number.isFinite(r.price) && r.price > 0;
}

// Retire les 5 % de prix les plus bas et les 5 % les plus hauts (aucun retrait sous 20 fiches)
export function trimExtremes(sortedAsc: number[]): number[] {
  const k = Math.floor(sortedAsc.length * TRIM_SHARE);
  return sortedAsc.slice(k, sortedAsc.length - k);
}

// Rang le plus proche : percentile(…, 10) = prix sous lequel se trouvent 10 % des fiches
export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

function averageRoundedTo5(prices: number[]): number {
  const kept = trimExtremes([...prices].sort((a, b) => a - b));
  const avg = kept.reduce((s, p) => s + p, 0) / kept.length;
  return Math.round(avg / 5) * 5;
}

export function matchesAccess(r: ThemeRow, key: AccessKey): boolean {
  return r[key];
}

export function inScope(rows: ThemeRow[], regionDb?: string, city?: string): ThemeRow[] {
  return rows.filter((r) => (!regionDb || r.region === regionDb) && (!city || r.city === city));
}

// Ordre habituel du site (revendiquées d'abord, meilleur score, plus récentes), avec en tête, à égalité, les fiches
// qui ont une photo et un prix affiché.
export function sortRows(rows: ThemeRow[]): ThemeRow[] {
  const complete = (r: ThemeRow) => (r.photos.length > 0 && hasDisplayedPrice(r) ? 1 : 0);
  return [...rows].sort(
    (a, b) =>
      a.rank - b.rank ||
      complete(b) - complete(a) ||
      b.score - a.score ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id)
  );
}

// Les `limit` premières fiches, au plus `perOwner` par exploitant ; si ça ne suffit pas, on complète avec les suivantes.
export function pickDiverse(rows: ThemeRow[], limit = GRID_SIZE, perOwner = MAX_PER_OWNER): ThemeRow[] {
  const sorted = sortRows(rows);
  const taken = new Map<string, number>();
  const picked: ThemeRow[] = [];
  const left: ThemeRow[] = [];
  for (const r of sorted) {
    const n = taken.get(r.ownerKey) ?? 0;
    if (picked.length < limit && n < perOwner) {
      picked.push(r);
      taken.set(r.ownerKey, n + 1);
    } else left.push(r);
  }
  return picked.length >= limit ? picked : [...picked, ...left.slice(0, limit - picked.length)];
}

export interface RegionStat { region: string; count: number; priceFrom: number | null }
export interface CityStat { region: string; city: string; count: number; priceFrom: number | null }

export interface ThemeStats {
  count: number;
  priceMin: number | null; // après retrait des 5 % extrêmes
  priceMinRaw: number | null; // plus bas prix réel, sans retrait
  priceP10: number | null;
  priceP90: number | null;
  guestsMin: number | null;
  guestsMax: number | null;
  regionsCount: number;
  citiesCount: number;
  byRegion: RegionStat[]; // régions avec au moins 1 fiche, plus de fiches d'abord
  byCity: CityStat[]; // villes avec au moins MIN_LISTINGS_INDEXED fiches
  byAccess: { direct: number; lake: number; lakePrivate: number; lakePublic: number; beach: number; boats: number };
  dogs: number;
  updatedAt: string;
}

function priceFromOf(rows: ThemeRow[]): number | null {
  const prices = rows.filter(hasDisplayedPrice).map((r) => r.price);
  return prices.length >= MIN_LISTINGS_INDEXED ? averageRoundedTo5(prices) : null;
}

export function computeStats(allRows: ThemeRow[], updatedAt: string, regionDb?: string, city?: string): ThemeStats {
  const rows = inScope(allRows, regionDb, city);
  const sortedPrices = rows.filter(hasDisplayedPrice).map((r) => r.price).sort((a, b) => a - b);
  const trimmed = trimExtremes(sortedPrices);
  const caps = rows.map((r) => r.capacity).filter((n) => Number.isFinite(n) && n > 0);

  const regionGroups = new Map<string, ThemeRow[]>();
  const cityGroups = new Map<string, ThemeRow[]>();
  for (const r of rows) {
    if (!getRegionByDbValue(r.region)) continue;
    regionGroups.set(r.region, [...(regionGroups.get(r.region) ?? []), r]);
    if (r.city && isKnownMunicipality(r.city)) {
      const key = `${r.region}|${r.city}`;
      cityGroups.set(key, [...(cityGroups.get(key) ?? []), r]);
    }
  }

  const byRegion: RegionStat[] = [...regionGroups.entries()]
    .map(([region, list]) => ({ region, count: list.length, priceFrom: priceFromOf(list) }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region, "fr"));
  const byCity: CityStat[] = [...cityGroups.entries()]
    .map(([key, list]) => {
      const [region, cityName] = key.split("|");
      return { region, city: cityName, count: list.length, priceFrom: priceFromOf(list) };
    })
    .filter((c) => c.count >= MIN_LISTINGS_INDEXED)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "fr"));

  return {
    count: rows.length,
    priceMin: trimmed[0] ?? null,
    priceMinRaw: sortedPrices[0] ?? null,
    priceP10: percentile(trimmed, 10),
    priceP90: percentile(trimmed, 90),
    guestsMin: caps.length ? Math.min(...caps) : null,
    guestsMax: caps.length ? Math.max(...caps) : null,
    regionsCount: regionGroups.size,
    citiesCount: new Set(rows.filter((r) => r.city && isKnownMunicipality(r.city)).map((r) => `${r.region}|${r.city}`)).size,
    byRegion,
    byCity,
    byAccess: {
      direct: rows.filter((r) => r.direct).length,
      lake: rows.filter((r) => r.lake).length,
      lakePrivate: rows.filter((r) => r.lakeAccess === "prive").length,
      lakePublic: rows.filter((r) => r.lakeAccess === "public").length,
      beach: rows.filter((r) => r.beach).length,
      boats: rows.filter((r) => r.boats).length,
    },
    dogs: rows.filter((r) => r.dogs).length,
    updatedAt,
  };
}

// Pastilles de sous-catégories à afficher (au moins MIN_LISTINGS_CHIP fiches)
export function visibleAccessChips(stats: ThemeStats): AccessKey[] {
  const counts: Record<AccessKey, number> = {
    direct: stats.byAccess.direct,
    lake: stats.byAccess.lake,
    beach: stats.byAccess.beach,
    boats: stats.byAccess.boats,
  };
  return ACCESS_KEYS.filter((k) => counts[k] >= MIN_LISTINGS_CHIP);
}

// Libellé du badge d'une carte : « Bord de l'eau », « Accès au lac · privé », plus « · plage » si applicable
export function accessBadge(r: ThemeRow): string {
  const base = r.direct
    ? "Bord de l'eau"
    : r.lakeAccess === "prive"
      ? "Accès au lac · privé"
      : r.lakeAccess === "public"
        ? "Accès au lac · public"
        : "Accès au lac";
  return r.beach ? `${base} · plage` : base;
}
