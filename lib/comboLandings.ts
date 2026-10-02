import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AMENITY_LANDINGS, listingMatchesLanding, type AmenityLandingKey } from "@/lib/amenityLandings";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR } from "@/lib/dogPolicy";
import { ACCESSIBLE_PATH_EN, ACCESSIBLE_PATH_FR } from "@/lib/accessibility";
import { REGIONS, getRegionByDbValue, type RegionConfig } from "@/lib/regions";
import { getRegionContent } from "@/lib/regionsContent";
import { isKnownMunicipality } from "@/lib/municipalities";
import { slugify } from "@/lib/slugify";

// Pages SEO/GEO qui croisent un type de chalet (spa, bord de l'eau, chiens…)
// avec une région ou une ville : /chalets/laurentides/avec-spa,
// /chalets/laurentides/mille-isles/bord-de-l-eau. Une page n'existe (sinon 404)
// et n'est liée nulle part tant qu'elle n'a pas MIN_LISTINGS_FOR_COMBO chalets
// publiés — évite les pages quasi vides et identiques que Google traite comme
// des pages satellites (choix de Simon, 2026-10-02). Rendue par
// app/chalets/[...segments]/_components/ComboLanding.tsx.
export const MIN_LISTINGS_FOR_COMBO = 3;

export type ComboThemeKey = AmenityLandingKey | "dogs" | "accessible";

// Colonnes nécessaires pour décider si une fiche appartient à un type
export const COMBO_MATCH_COLUMNS = "region, city, amenities, dogs_allowed, reduced_mobility";

export type ComboMatchRow = {
  region?: unknown;
  city?: unknown;
  amenities?: unknown;
  dogs_allowed?: unknown;
  reduced_mobility?: unknown;
};

export interface ComboTheme {
  key: ComboThemeKey;
  slugFr: string;
  slugEn: string;
  // Nom d'icône de components/AmenityIcon.tsx ; chiens et accessibilité ont leur propre composant
  icon: string;
  // Début du H1/title, suivi du lieu : « Location de chalet avec spa » + « dans les Laurentides »
  phraseFr: string;
  phraseEn: string;
  linkFr: string; // « Chalets avec spa »
  linkEn: string;
  nounFr: [string, string];
  nounEn: [string, string];
  // Page thématique nationale (parent dans le fil d'Ariane)
  parentPathFr: string;
  parentPathEn: string;
  // Paramètres de la recherche filtrée (/chalets?…)
  searchParams: Record<string, string>;
  amenityIds?: string[];
  accessQuestionFr?: string;
  accessQuestionEn?: string;
  matches: (row: ComboMatchRow) => boolean;
}

export const COMBO_THEMES: ComboTheme[] = [
  ...AMENITY_LANDINGS.map((l): ComboTheme => ({
    key: l.key,
    slugFr: l.slugFr,
    slugEn: l.slugEn,
    icon: l.icon,
    phraseFr: l.h1Fr.replace(/ au Québec$/, ""),
    phraseEn: l.h1En.replace(/ in Quebec$/, ""),
    linkFr: l.linkFr,
    linkEn: l.linkEn,
    nounFr: l.nounFr,
    nounEn: l.nounEn,
    parentPathFr: l.pathFr,
    parentPathEn: l.pathEn,
    searchParams: { amenities: l.amenityIds[0] },
    amenityIds: l.amenityIds,
    accessQuestionFr: l.accessQuestionFr,
    accessQuestionEn: l.accessQuestionEn,
    matches: (row) => listingMatchesLanding(row.amenities, l),
  })),
  {
    key: "dogs",
    slugFr: "chiens-acceptes",
    slugEn: "dog-friendly",
    icon: "Paw",
    phraseFr: "Location de chalet avec chien",
    phraseEn: "Dog-friendly cabin rentals",
    linkFr: "Chalets avec chien",
    linkEn: "Dog-friendly cabins",
    nounFr: ["chalet qui accepte les chiens", "chalets qui acceptent les chiens"],
    nounEn: ["dog-friendly cabin", "dog-friendly cabins"],
    parentPathFr: DOG_FRIENDLY_PATH_FR,
    parentPathEn: DOG_FRIENDLY_PATH_EN,
    searchParams: { dogs: "1" },
    matches: (row) => row.dogs_allowed === true,
  },
  {
    key: "accessible",
    slugFr: "accessible-mobilite-reduite",
    slugEn: "wheelchair-accessible",
    icon: "Accessibility",
    phraseFr: "Location de chalet accessible",
    phraseEn: "Wheelchair-accessible cabin rentals",
    linkFr: "Chalets accessibles",
    linkEn: "Accessible cabins",
    nounFr: ["chalet accessible", "chalets accessibles"],
    nounEn: ["accessible cabin", "accessible cabins"],
    parentPathFr: ACCESSIBLE_PATH_FR,
    parentPathEn: ACCESSIBLE_PATH_EN,
    searchParams: { accessible: "1" },
    matches: (row) => row.reduced_mobility === true,
  },
];

export function getComboThemeBySlug(slug: string, isEn: boolean): ComboTheme | undefined {
  return COMBO_THEMES.find((t) => (isEn ? t.slugEn : t.slugFr) === slug);
}

export function getComboTheme(key: ComboThemeKey): ComboTheme {
  return COMBO_THEMES.find((t) => t.key === key)!;
}

// Slugs réservés : un lien personnalisé de fiche (3ᵉ segment) ne doit jamais
// masquer une page ville × type (même position dans l'URL).
export const RESERVED_COMBO_SLUGS = new Set(COMBO_THEMES.flatMap((t) => [t.slugFr, t.slugEn]));

// « dans les Laurentides » / « in the Laurentians » / « à Mille-Isles »
export function comboPlace(region: RegionConfig, city: string | null, isEn: boolean): string {
  if (city) return isEn ? `in ${city}` : `à ${city}`;
  return isEn ? (getRegionContent(region.slug)?.locative_en ?? `in ${region.nameEn}`) : region.locative;
}

export function comboPath(theme: ComboTheme, region: RegionConfig, city: string | null, isEn: boolean): string {
  const base = isEn ? `/en/cabins/${region.slugEn}` : `/chalets/${region.slug}`;
  return `${base}${city ? `/${slugify(city)}` : ""}/${isEn ? theme.slugEn : theme.slugFr}`;
}

export function comboSearchPath(theme: ComboTheme, region: RegionConfig, city: string | null, isEn: boolean): string {
  const params = new URLSearchParams({ region: region.dbValue, ...(city ? { city } : {}), ...theme.searchParams });
  return `${isEn ? "/en/cabins" : "/chalets"}?${params.toString()}`;
}

// ── Index des combinaisons actives ────────────────────────────────────────────

// Comptes par région (dbValue) et par ville (clé `${dbValue}|${ville}`), pour
// chaque type. Objets simples (pas de Map) : le résultat passe par unstable_cache.
export type ComboIndex = {
  region: Record<string, Partial<Record<ComboThemeKey, number>>>;
  city: Record<string, Partial<Record<ComboThemeKey, number>>>;
};

export function buildComboIndex(rows: ComboMatchRow[]): ComboIndex {
  const index: ComboIndex = { region: {}, city: {} };
  for (const row of rows) {
    const region = typeof row.region === "string" ? row.region : null;
    if (!region || !getRegionByDbValue(region)) continue;
    const city = typeof row.city === "string" && isKnownMunicipality(row.city) ? row.city : null;
    for (const theme of COMBO_THEMES) {
      if (!theme.matches(row)) continue;
      const r = (index.region[region] ??= {});
      r[theme.key] = (r[theme.key] ?? 0) + 1;
      if (city) {
        const c = (index.city[`${region}|${city}`] ??= {});
        c[theme.key] = (c[theme.key] ?? 0) + 1;
      }
    }
  }
  return index;
}

async function computeComboIndex(): Promise<ComboIndex> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.from("listings").select(COMBO_MATCH_COLUMNS).eq("is_published", true);
  if (error) console.error("comboLandings: erreur Supabase sur l'index", error);
  return buildComboIndex((data ?? []) as ComboMatchRow[]);
}

// Même délai que les liens du pied de page (lib/themeLinks.ts). La page
// combinée elle-même recompte à partir de données fraîches avant de s'afficher.
export const getComboIndex = unstable_cache(computeComboIndex, ["combo-index-v1"], { revalidate: 600 });

export type ComboLink = { theme: ComboTheme; region: RegionConfig; city: string | null; count: number };

function themesAt(counts: Partial<Record<ComboThemeKey, number>> | undefined, region: RegionConfig, city: string | null): ComboLink[] {
  return COMBO_THEMES
    .map((theme) => ({ theme, region, city, count: counts?.[theme.key] ?? 0 }))
    .filter((l) => l.count >= MIN_LISTINGS_FOR_COMBO);
}

// Types actifs dans une région, ou dans une ville
export function activeThemesInRegion(index: ComboIndex, region: RegionConfig): ComboLink[] {
  return themesAt(index.region[region.dbValue], region, null);
}

export function activeThemesInCity(index: ComboIndex, region: RegionConfig, city: string): ComboLink[] {
  return themesAt(index.city[`${region.dbValue}|${city}`], region, city);
}

// Régions où un type est actif (ordre de REGIONS)
export function activeRegionsForTheme(index: ComboIndex, key: ComboThemeKey): ComboLink[] {
  const theme = getComboTheme(key);
  return REGIONS
    .map((region) => ({ theme, region, city: null, count: index.region[region.dbValue]?.[key] ?? 0 }))
    .filter((l) => l.count >= MIN_LISTINGS_FOR_COMBO);
}

// Villes où un type est actif, dans une région ou partout (plus de chalets d'abord)
export function activeCitiesForTheme(index: ComboIndex, key: ComboThemeKey, region?: RegionConfig): ComboLink[] {
  const theme = getComboTheme(key);
  const links: ComboLink[] = [];
  for (const [cityKey, counts] of Object.entries(index.city)) {
    const [regionDb, city] = cityKey.split("|");
    if (region && regionDb !== region.dbValue) continue;
    const regionConfig = getRegionByDbValue(regionDb);
    const count = counts[key] ?? 0;
    if (!regionConfig || count < MIN_LISTINGS_FOR_COMBO) continue;
    links.push({ theme, region: regionConfig, city, count });
  }
  return links.sort((a, b) => b.count - a.count || a.city!.localeCompare(b.city!, "fr"));
}

// Toutes les combinaisons actives (sitemap, llms.txt)
export function allActiveCombos(index: ComboIndex): ComboLink[] {
  const regionLinks = REGIONS.flatMap((region) => activeThemesInRegion(index, region));
  const cityLinks = COMBO_THEMES.flatMap((theme) => activeCitiesForTheme(index, theme.key));
  return [...regionLinks, ...cityLinks];
}

// « Chalets avec spa dans les Laurentides » (ou sans le lieu)
export function comboLinkLabel(link: ComboLink, isEn: boolean, { withPlace = true }: { withPlace?: boolean } = {}): string {
  const base = isEn ? link.theme.linkEn : link.theme.linkFr;
  return withPlace ? `${base} ${comboPlace(link.region, link.city, isEn)}` : base;
}
