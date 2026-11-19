import { getMunicipalityBySlug } from "./municipalities";
import { slugify } from "./slugify";

// Normalise un nom de ville québécoise saisi manuellement, pour réduire les
// variantes orthographiques qui créeraient des pages "ville" distinctes pour
// le même endroit (ex. "St-Sauveur" vs "Saint-Sauveur") — voir lib/slugify.ts,
// qui ne normalise que les caractères (accents, casse), jamais les
// abréviations. Volontairement conservateur : n'étend que "St"/"Ste", ne
// touche pas aux accents manquants ni à la casse des connecteurs français
// (de/du/la/les/sur/aux/l'), pour éviter les faux positifs.
export function normalizeCityName(input: string): string {
  let city = input.trim().replace(/\s+/g, " ");
  if (!city) return city;

  // "Ste"/"Ste." → "Sainte-", "St"/"St." → "Saint-" — mot entier uniquement
  // (\b), suivi d'un tiret ou d'un espace, jamais à l'intérieur d'un autre
  // mot (ex. ne matche pas "Stanstead"). Le rôle de séparateur (tiret/espace)
  // capturé est remplacé par un tiret, donc "Saint Sauveur" devient aussi
  // "Saint-Sauveur" au passage.
  city = city.replace(/\bSte\.?[ -]/gi, "Sainte-");
  city = city.replace(/\bSt\.?[ -]/gi, "Saint-");

  // Nettoyage des tirets multiples/en bordure créés par les remplacements ci-dessus.
  city = city.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  // Majuscule sur la première lettre seulement — jamais de "title case"
  // complet, qui casserait les connecteurs français en minuscule
  // (ex. "Saint-Jean-sur-Richelieu" doit garder "sur" en minuscule).
  return city.charAt(0).toUpperCase() + city.slice(1);
}

// Nom à enregistrer dans listings.city : St/Ste étendus, puis, si le résultat
// est une municipalité officielle (même slug), son orthographe exacte
// (« Saint Come » → « Saint-Côme », « Saint-Denis-De La Bouteillerie »). Un nom
// hors liste (secteur, texte libre) reste tel quel : la page ville exige un nom
// officiel (voir app/chalets/[...segments]/page.tsx).
export function canonicalCityName(input: string): string {
  const city = normalizeCityName(input);
  return getMunicipalityBySlug(slugify(city))?.name ?? city;
}

// Ancien segment d'URL « st-raymond » / « ste-agathe-des-monts » → « saint-… » /
// « sainte-… » (redirection 301). null si le segment n'est pas abrégé.
export function expandSaintSlug(slug: string): string | null {
  const m = /^(ste?)-(.+)$/.exec(slug);
  if (!m) return null;
  return `${m[1] === "ste" ? "sainte" : "saint"}-${m[2]}`;
}
