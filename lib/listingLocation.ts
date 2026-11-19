import { MUNICIPALITIES } from "./municipalities";
import { canonicalCityName } from "./normalizeCityName";

export type LocationProblem = "city" | "region" | "mismatch";

const REGIONS_BY_CITY = new Map<string, Set<string>>();
for (const m of MUNICIPALITIES) {
  if (!REGIONS_BY_CITY.has(m.name)) REGIONS_BY_CITY.set(m.name, new Set());
  REGIONS_BY_CITY.get(m.name)!.add(m.region);
}

// Ce qui empêche de mettre une fiche en ligne : sans municipalité officielle l'adresse devient « /autre/ »,
// sans région elle n'a aucune adresse publique. null = la localisation est valide.
export function locationProblem(city: string | null | undefined, region: string | null | undefined): LocationProblem | null {
  const c = (city ?? "").trim();
  const r = (region ?? "").trim();
  const regions = REGIONS_BY_CITY.get(c);
  if (!c || !regions) return "city";
  if (!r) return "region";
  return regions.has(r) ? null : "mismatch";
}

export const LOCATION_PROBLEM_MESSAGE = {
  fr: "Choisissez la ville de votre chalet (section Localisation) avant de publier.",
  en: "Choose your cabin's city (Location section) before publishing.",
};

// Suggestion seulement (« À Chertsey, ce chalet… ») : jamais appliquée sans validation humaine.
// Ne retourne qu'une municipalité officielle.
export function suggestCityFromText(text: string | null | undefined): string | null {
  const m = /(?:^|\n)\s*(?:À|A)\s+([^,.\n:;]{3,60}?)\s*[,.:]/.exec(text ?? "");
  if (!m) return null;
  const city = canonicalCityName(m[1]);
  return REGIONS_BY_CITY.has(city) ? city : null;
}
