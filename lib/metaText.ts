import { truncateToLastWord } from "@/lib/aiText";

// Mots qui ne doivent jamais terminer un titre ou une description coupés
// (« Spa, piscine et », « …près de »).
const TRAILING_FILLER = /[\s,;:–—|&-]+$|\s+(et|ou|de|du|des|la|le|les|à|au|aux|en|avec|pour|sur|and|or|of|the|a|an|with|for|in|on|to)$/i;

function stripTrailingFiller(text: string): string {
  let out = text.trim();
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(TRAILING_FILLER, "").trim();
  }
  return out;
}

// Description pour la balise meta : texte sur une ligne, coupé au dernier mot
// complet avant `max` caractères, avec « … » si coupé.
export function metaDescription(text: string | null | undefined, max = 155): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${stripTrailingFiller(truncateToLastWord(flat, max - 1))}…`;
}

// Titre d'annonce nettoyé pour la balise <title> (un titre saisi ou importé
// peut finir par « et » ou une virgule).
export function metaTitle(text: string): string {
  return stripTrailingFiller(text);
}
