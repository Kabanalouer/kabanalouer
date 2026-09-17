import { getRegionByDbValue } from "./regions";
import { slugify } from "./slugify";

interface ListingPathInput {
  region: string | null;   // valeur brute de listings.region (dbValue)
  city: string | null;
  slug_fr: string | null;
  slug_en: string | null;
}

// Segment ville de repli — une annonce peut techniquement ne pas avoir de
// ville renseignée (champ non requis en base), auquel cas le chemin à 3
// segments a quand même besoin d'un segment non vide.
const FALLBACK_CITY_SLUG_FR = "autre";
const FALLBACK_CITY_SLUG_EN = "other";

// Construit le chemin canonique /chalets/région/ville/nom (ou /en/cabins/...)
// d'une annonce. Retourne null si la région est inconnue ou si le slug du
// chalet dans la langue demandée n'a pas encore été généré — les deux cas où
// aucune URL fiable ne peut être construite.
export function buildListingPath(listing: ListingPathInput, locale: "fr" | "en"): string | null {
  const regionConfig = listing.region ? getRegionByDbValue(listing.region) : undefined;
  if (!regionConfig) return null;

  const chaletSlug = locale === "en"
    ? (listing.slug_en ?? listing.slug_fr)
    : (listing.slug_fr ?? listing.slug_en);
  if (!chaletSlug) return null;

  const regionSlug = locale === "en" ? regionConfig.slugEn : regionConfig.slug;
  const citySlug = listing.city
    ? slugify(listing.city)
    : (locale === "en" ? FALLBACK_CITY_SLUG_EN : FALLBACK_CITY_SLUG_FR);

  const base = locale === "en" ? "/en/cabins" : "/chalets";
  return `${base}/${regionSlug}/${citySlug}/${chaletSlug}`;
}
