import { getRegionByDbValue } from "@/lib/regions";
import { isKnownMunicipality } from "@/lib/municipalities";

// Calculs des pages thème (gabarit ThemeLandingPage) : fonctions pures sur des lignes déjà lues (voir lib/themeData.ts
// pour la lecture en base et le cache de 24 h). Aucune donnée inventée : tout vient des fiches publiées.

// Seuil d'une page région ou ville indexée (même règle que lib/comboLandings.ts)
export const MIN_LISTINGS_INDEXED = 3;
// Une page ville n'est indexée qu'à partir de ce nombre de fiches (2026-11-28) ; en dessous : noindex + canonical vers la région
export const MIN_LISTINGS_CITY_INDEXED = 5;
// Un chalet « grand groupe » reçoit au moins ce nombre de voyageurs
export const LARGE_GROUP_GUESTS = 10;
// Une sous-catégorie sous ce nombre de fiches n'a pas de pastille
export const MIN_LISTINGS_CHIP = 5;
export const GRID_SIZE = 24;
export const MAX_PER_OWNER = 2;
const TRIM_SHARE = 0.05;

// Équipements dont l'un suffit pour appartenir au thème (même règle que lib/amenityLandings.ts)
export const THEME_AMENITY_IDS: Record<string, string[]> = {
  "bord-de-l-eau": ["bord-eau", "acces-lac"],
  "avec-spa": ["spa"],
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
  // Thème spa (détails de l'équipement « spa » ; null = non renseigné)
  spa: boolean;
  spaAccess: "prive" | "partage" | null;
  spaPlaces: number | null;
  spaYear: boolean | null;
  sauna: boolean;
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

export interface RegionStat { region: string; count: number; priceFrom: number | null; yearRound: number }
export interface CityStat { region: string; city: string; count: number; priceFrom: number | null; yearRound: number }

// Chiffres propres au thème spa (calculés pour tous les thèmes, affichés seulement pour le spa)
export interface SpaStats {
  prive: number;
  partage: number;
  annee: number; // spa ouvert à l'année
  anneeConnu: number; // fiches où l'info est remplie
  placesConnu: number; // fiches où le nombre de places est rempli
  placesMediane: number | null;
  places6plus: number;
  deux: number; // chalets de 2 à 4 voyageurs
  groupes: number; // 10 voyageurs ou plus
  bordEau: number;
  sauna: number;
  chiens: number;
}

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
  spa: SpaStats;
  large: number; // chalets de LARGE_GROUP_GUESTS voyageurs ou plus
  pricedCount: number; // fiches avec un prix affiché
  updatedAt: string;
}

const yearRoundOf = (rows: ThemeRow[]) => rows.filter((r) => r.spaYear === true).length;

function medianOf(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  return sortedAsc.length % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

function spaStatsOf(rows: ThemeRow[]): SpaStats {
  const places = rows.map((r) => r.spaPlaces).filter((n): n is number => n !== null).sort((a, b) => a - b);
  return {
    prive: rows.filter((r) => r.spaAccess === "prive").length,
    partage: rows.filter((r) => r.spaAccess === "partage").length,
    annee: yearRoundOf(rows),
    anneeConnu: rows.filter((r) => r.spaYear !== null).length,
    placesConnu: places.length,
    placesMediane: medianOf(places),
    places6plus: places.filter((n) => n >= 6).length,
    deux: rows.filter((r) => r.capacity >= 2 && r.capacity <= 4).length,
    groupes: rows.filter((r) => r.capacity >= LARGE_GROUP_GUESTS).length,
    bordEau: rows.filter((r) => r.spa && (r.direct || r.lake)).length,
    sauna: rows.filter((r) => r.spa && r.sauna).length,
    chiens: rows.filter((r) => r.spa && r.dogs).length,
  };
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
    .map(([region, list]) => ({ region, count: list.length, priceFrom: priceFromOf(list), yearRound: yearRoundOf(list) }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region, "fr"));
  const byCity: CityStat[] = [...cityGroups.entries()]
    .map(([key, list]) => {
      const [region, cityName] = key.split("|");
      return { region, city: cityName, count: list.length, priceFrom: priceFromOf(list), yearRound: yearRoundOf(list) };
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
    spa: spaStatsOf(rows),
    large: rows.filter((r) => r.capacity >= LARGE_GROUP_GUESTS).length,
    pricedCount: sortedPrices.length,
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

// ── Sous-catégories (pastilles) et badge des cartes, par thème ──
// suffix : fin de phrase du bouton « Voir les N chalets avec spa … » quand la pastille est choisie
export interface ThemeFilter { key: string; label: string; suffix: string; test: (r: ThemeRow) => boolean }

export const THEME_FILTERS: Record<string, { param: "acces" | "filtre"; filters: ThemeFilter[] }> = {
  "bord-de-l-eau": {
    param: "acces",
    filters: [
      { key: "direct", label: "Directement au bord de l'eau", suffix: "directement sur la rive", test: (r) => r.direct },
      { key: "lake", label: "Accès au lac", suffix: "avec accès à un lac", test: (r) => r.lake },
      { key: "beach", label: "Avec plage", suffix: "avec plage", test: (r) => r.beach },
      { key: "boats", label: "Embarcations incluses", suffix: "avec embarcations incluses", test: (r) => r.boats },
    ],
  },
  "avec-spa": {
    param: "filtre",
    filters: [
      { key: "annee", label: "Spa ouvert à l'année", suffix: "dont le spa est ouvert à l'année", test: (r) => r.spaYear === true },
      { key: "deux", label: "Pour 2 à 4 personnes", suffix: "pour 2 à 4 personnes", test: (r) => r.capacity >= 2 && r.capacity <= 4 },
      { key: "groupes", label: "Grands groupes (10+)", suffix: "pour 10 personnes ou plus", test: (r) => r.capacity >= LARGE_GROUP_GUESTS },
      { key: "eau", label: "Spa + bord de l'eau", suffix: "au bord de l'eau", test: (r) => r.direct || r.lake },
      { key: "sauna", label: "Spa + sauna", suffix: "et sauna", test: (r) => r.sauna },
      { key: "chiens", label: "Chiens acceptés", suffix: "qui acceptent les chiens", test: (r) => r.dogs },
    ],
  },
};

// « Ouvert à l'année » n'est affiché (intro, chiffre clé, tableau, description) que si l'info est remplie sur au moins
// 30 % des fiches : sinon un « 15 » laisserait croire que les autres spas ferment.
export function yearRoundKnownEnough(stats: ThemeStats): boolean {
  return stats.spa.annee > 0 && stats.spa.anneeConnu >= 0.3 * stats.count;
}

// Même sous-catégories vues par la recherche (/chalets?theme=…&sub=…) : le bouton « Voir les N chalets » d'une page thème
// filtrée mène à une liste du même nombre. Chaque filtre ci-dessus doit avoir son équivalent ici (et inversement).
// or : au moins un de ces motifs d'équipement (JSON de confinement) ; capMin / capMax : voyageurs ; dogs : chiens acceptés.
export interface FilterQuery { or?: object[][]; capMin?: number; capMax?: number; dogs?: boolean }
export const THEME_FILTER_QUERY: Record<string, Record<string, FilterQuery>> = {
  "bord-de-l-eau": {
    direct: { or: [[{ id: "bord-eau" }]] },
    lake: { or: [[{ id: "acces-lac" }]] },
    beach: { or: [[{ id: "acces-lac", details: { plage: true } }]] },
    boats: {
      or: [
        [{ id: "acces-lac", details: { locationEmbarcations: true, gratuitPayant: "Gratuit" } }],
        [{ id: "embarcations", details: { gratuitPayant: "Gratuit" } }],
      ],
    },
  },
  "avec-spa": {
    annee: { or: [[{ id: "spa", details: { disponibleAnnee: true } }]] },
    deux: { capMin: 2, capMax: 4 },
    groupes: { capMin: LARGE_GROUP_GUESTS },
    eau: { or: [[{ id: "bord-eau" }], [{ id: "acces-lac" }]] },
    sauna: { or: [[{ id: "sauna" }]] },
    chiens: { dogs: true },
  },
};

// Badge d'une carte (null = aucun). Spa : l'information utile (places, ouverture à l'année), jamais « Spa · Privé » seul.
export function spaBadge(r: ThemeRow): string | null {
  if (r.spaAccess === "partage") return "Spa partagé";
  if (r.spaPlaces !== null && r.spaYear) return `Spa ${r.spaPlaces} places · à l'année`;
  if (r.spaPlaces !== null) return `Spa ${r.spaPlaces} places`;
  if (r.spaYear) return "Spa à l'année";
  return null;
}

export function themeBadge(themeSlug: string, r: ThemeRow): string | null {
  return themeSlug === "avec-spa" ? spaBadge(r) : accessBadge(r);
}
