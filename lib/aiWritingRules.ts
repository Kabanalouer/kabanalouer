// Règles de rédaction partagées entre les prompts système IA (titre et
// description) — évite de dupliquer le même texte dans les deux routes.

export const NO_GENERIC_ADJECTIVES_FR =
  "N'utilise jamais d'adjectifs ou tournures génériques et vides de sens comme « charmant », « magnifique », « unique en son genre », « havre de paix », « incontournable », « paradis », « idéal », « parfait », ou toute formule équivalente qui pourrait s'appliquer à n'importe quel chalet. Ancre plutôt le texte dans au moins un fait concret et vérifiable tiré du contexte fourni (capacité précise en personnes, équipement nommé, région ou ville).";

export const NO_GENERIC_ADJECTIVES_EN =
  "Never use generic, meaningless adjectives or phrases like \"charming\", \"beautiful\", \"one of a kind\", \"haven of peace\", \"a must-see\", \"paradise\", \"ideal\", \"perfect\", or any equivalent that could apply to any cabin. Ground the text instead in at least one concrete, verifiable fact from the context provided (exact capacity in people, a named amenity, a region or city).";

export const PRIORITIZE_DIFFERENTIATING_AMENITIES_FR =
  "Quand plusieurs équipements sont fournis dans le contexte, priorise ceux qui différencient vraiment ce chalet des chalets standards (ex: spa, sauna, accès lac privé, quai, vue panoramique, foyer extérieur, cabane à sucre) plutôt que les équipements de base attendus par défaut sur presque toutes les annonces (wifi, stationnement, air climatisé) — même si ces derniers figurent dans la liste des caractéristiques.";

export const PRIORITIZE_DIFFERENTIATING_AMENITIES_EN =
  "When several amenities are provided in the context, prioritize the ones that genuinely set this cabin apart from standard cabins (e.g. spa, sauna, private lake access, dock, panoramic view, outdoor fireplace, sugar shack) over baseline amenities expected on almost every listing (wifi, parking, air conditioning) — even if those are also present in the amenities list.";

// Mots/tournures littéraux de la liste noire, pour une vérification par
// correspondance de texte côté code après génération (voir generate-description).
// Garder en phase avec NO_GENERIC_ADJECTIVES_FR/EN ci-dessus.
export const GENERIC_ADJECTIVE_WORDS_FR = [
  "charmant", "charmante", "charmants", "charmantes",
  "magnifique", "magnifiques",
  "unique en son genre",
  "havre de paix",
  "incontournable", "incontournables",
  "paradis",
  "idéal", "idéale", "idéals", "idéales",
  "parfait", "parfaite", "parfaits", "parfaites",
];

export const GENERIC_ADJECTIVE_WORDS_EN = [
  "charming",
  "beautiful",
  "one of a kind", "one-of-a-kind",
  "haven of peace",
  "must-see", "must see",
  "paradise",
  "ideal",
  "perfect",
];

export function findGenericAdjectives(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((word) => lower.includes(word.toLowerCase()));
}
