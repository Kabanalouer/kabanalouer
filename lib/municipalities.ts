import municipalitiesData from "./municipalities.json";

// Source unique de vérité pour lib/municipalities.json — évite de dupliquer
// l'interface Municipality et les Map de correspondance dans chaque fichier
// qui en a besoin (components/dashboard/MunicipalityCombobox.tsx,
// components/dashboard/LocationSection.tsx, app/sitemap.ts,
// app/chalets/ville/[slug]/page.tsx).
export interface Municipality {
  name: string;
  slug: string;
  region: string;
  officialCode: string;
  mrc: string;
}

export const MUNICIPALITIES: Municipality[] = municipalitiesData as Municipality[];

const BY_NAME = new Map(MUNICIPALITIES.map((m) => [m.name, m]));
const BY_SLUG = new Map(MUNICIPALITIES.map((m) => [m.slug, m]));

export function getMunicipalityByName(name: string): Municipality | undefined {
  return BY_NAME.get(name);
}

export function getMunicipalityBySlug(slug: string): Municipality | undefined {
  return BY_SLUG.get(slug);
}

// Utilisé pour distinguer une ville "officielle" (municipalité constituée,
// répertoire MAMH) d'une ville issue du filet de sécurité "Je ne trouve pas
// ma localité" (texte libre, TNO ou lieu non répertorié) — cette dernière ne
// doit jamais générer de page /chalets/ville/[slug] (URL imprévisible),
// voir app/sitemap.ts et app/chalets/ville/[slug]/page.tsx.
export function isKnownMunicipality(name: string): boolean {
  return BY_NAME.has(name);
}
