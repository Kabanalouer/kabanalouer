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

// Description de fiche pour la balise meta, avec la ville : si le texte ne la
// mentionne pas, on la place en tête (« Chalets à Saint-Zénon, Lanaudière. … »),
// et une fiche sans description reçoit une phrase de remplacement. Sert aux
// requêtes locales (« chalet à X »).
export function metaDescriptionWithCity(
  text: string | null | undefined,
  city: string | null | undefined,
  region: string | null | undefined,
  isEn: boolean,
  max = 155
): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (!city) return metaDescription(flat, max);
  const place = region ? `${city}, ${region}` : city;
  if (!flat) {
    return metaDescription(
      isEn
        ? `Cabins in ${place}. Contact the owner directly on Kabanalouer, no service fees for travelers.`
        : `Chalets à ${place}. Contactez directement le propriétaire sur Kabanalouer, sans frais de service pour les voyageurs.`,
      max
    );
  }
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (norm(flat).includes(norm(city))) return metaDescription(flat, max);
  return metaDescription(`${isEn ? "Cabins in" : "Chalets à"} ${place}. ${flat}`, max);
}

// Titre d'annonce nettoyé pour la balise <title> (un titre saisi ou importé
// peut finir par « et » ou une virgule).
export function metaTitle(text: string): string {
  return stripTrailingFiller(text);
}
