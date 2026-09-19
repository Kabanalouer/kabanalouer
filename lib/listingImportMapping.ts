// Mappe les données brutes des actors Apify (Airbnb, VRBO) vers les champs
// de `listings`. Vérifié contre de vraies réponses d'actor (pas de schéma
// deviné) — voir le rapport d'exploration pour le détail des formats.
//
// `amenities` et `region` sur `listings` sont des listes fermées (voir
// lib/amenities-catalog.ts et lib/regions.ts) — le texte scrapé ne matche jamais
// exactement, donc tout passe par un mapping best-effort par mots-clés. Ce
// qui ne matche rien est conservé dans `rawAmenities`/`rawRegionCandidate`
// pour révision admin plutôt que d'être perdu silencieusement.

import { AMENITY_CATALOG, type AmenityValue } from "@/lib/amenities-catalog";
import { REGIONS } from "@/lib/regions";
import { truncateToLastWord } from "@/lib/aiText";

// Doit rester synchronisé avec CAPTION_MAX dans components/dashboard/PhotoUpload.tsx.
const CAPTION_MAX_LENGTH = 200;

export type ImportedListingData = {
  title: string | null;
  description: string | null;
  photos: { url: string; caption: string }[];
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: AmenityValue[];
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  priceLow: number | null;
  rawAmenities: string[];
  rawRegionCandidate: string | null;
};

// Mots-clés (FR + EN, en minuscules) associés à certains id du catalogue
// (lib/amenities-catalog.ts). Best-effort — couvre seulement les équipements
// déjà reconnus avant le catalogue enrichi, complété au besoin si des
// imports réels révèlent des libellés non reconnus.
const AMENITY_KEYWORDS: Record<string, string[]> = {
  "bord-eau": ["waterfront", "bord de l'eau", "lakefront", "lake access", "accès à l'eau"],
  "piscine-interieure": ["indoor pool", "piscine intérieure"],
  "piscine-exterieure": ["outdoor pool", "piscine extérieure", "pool"],
  "ski-in-ski-out": ["ski in", "ski-in", "ski out", "ski-out"],
  "situe-resort": ["resort"],
  "spa": ["hot tub", "spa", "jacuzzi"],
  "sauna": ["sauna"],
  "chalet-bois-rond": ["log cabin", "bois rond"],
  "foyer-interieur-bois": ["wood fireplace", "wood-burning fireplace", "foyer intérieur", "indoor fireplace"],
  "foyer-exterieur": ["fire pit", "firepit", "foyer extérieur", "outdoor fireplace"],
  "bbq": ["bbq", "barbecue", "grill"],
  "table-billard": ["pool table", "billiard", "billard"],
  "babyfoot": ["foosball", "babyfoot"],
  "table-ping-pong": ["ping pong", "ping-pong", "table tennis"],
  "arcades": ["arcade"],
  "jeux-societe": ["board game", "jeux de société"],
  "livres-revues": ["books", "magazines", "livres et revues"],
  "gym": ["gym", "fitness", "exercise equipment"],
  "wifi": ["wifi", "wi-fi", "wireless internet"],
  "espace-travail": ["workspace", "espace de travail", "dedicated workspace"],
  "climatisation": ["air conditioning", "climatisation", "a/c", "ac unit"],
  "tv-intelligente": ["smart tv", "cable tv"],
  "systeme-audio": ["sound system"],
  "cuisine-complete": ["kitchen", "cuisine"],
  "literie-serviettes": ["linens", "towels", "literie", "serviettes"],
  "buanderie": ["washer", "dryer", "laundry", "laveuse", "sécheuse", "buanderie"],
  "terrasse": ["deck", "terrace", "terrasse", "patio"],
  "module-jeux-enfant": ["play area", "playground", "module de jeux"],
  "borne-recharge-vr": ["ev charg", "electric vehicle", "borne de recharge"],
};

const AMENITY_CATALOG_IDS = new Set(AMENITY_CATALOG.map((e) => e.id));

export function matchAmenities(rawLabels: string[]): { matched: AmenityValue[]; unmatched: string[] } {
  const matchedIds = new Set<string>();
  const unmatched: string[] = [];

  for (const raw of rawLabels) {
    if (!raw) continue;
    const norm = raw.toLowerCase();
    let found = false;
    for (const id of AMENITY_CATALOG_IDS) {
      const keywords = AMENITY_KEYWORDS[id] ?? [];
      if (keywords.some((k) => norm.includes(k))) {
        matchedIds.add(id);
        found = true;
        break;
      }
    }
    if (!found) unmatched.push(raw);
  }

  return { matched: Array.from(matchedIds).map((id) => ({ id, details: {} })), unmatched };
}

export function matchRegion(candidate: string | null): string | null {
  if (!candidate) return null;
  const norm = candidate.trim().toLowerCase();
  if (!norm) return null;
  const found = REGIONS.find(
    (r) =>
      r.name.toLowerCase() === norm ||
      r.dbValue.toLowerCase() === norm ||
      norm.includes(r.name.toLowerCase())
  );
  return found ? found.dbValue : null;
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ── Airbnb — actor tri_angle/airbnb-rooms-urls-scraper ──────────────────────
// Champs confirmés sur un vrai run : title, description, images[].imageUrl,
// personCapacity, subDescription.items (ex. "5 chambres"), coordinates,
// location (ville), breadcrumbs (dernier élément = région), amenities[]
// (groupes avec values[].title/available), price (souvent absent sans
// checkIn/checkOut dans l'input).
export function mapAirbnbItem(item: Record<string, unknown>): ImportedListingData {
  const subItems = Array.isArray((item.subDescription as { items?: unknown[] })?.items)
    ? ((item.subDescription as { items: unknown[] }).items as string[])
    : [];

  const bedroomsMatch = subItems.map((s) => s.match(/^(\d+)\s*chambres?$/i)).find(Boolean);
  const bathroomsMatch = subItems.map((s) => s.match(/^(\d+)\s*salles?\s*de\s*bain$/i)).find(Boolean);

  const amenityGroups = Array.isArray(item.amenities) ? (item.amenities as Record<string, unknown>[]) : [];
  const rawAmenityLabels = amenityGroups
    .flatMap((group) => (Array.isArray(group.values) ? (group.values as Record<string, unknown>[]) : []))
    .filter((v) => v.available !== false)
    .map((v) => (typeof v.title === "string" ? v.title : null))
    .filter((v): v is string => !!v);
  const { matched, unmatched } = matchAmenities(rawAmenityLabels);

  const breadcrumbs = Array.isArray(item.breadcrumbs) ? (item.breadcrumbs as Record<string, unknown>[]) : [];
  const regionCandidate =
    breadcrumbs.length > 0 && typeof breadcrumbs[breadcrumbs.length - 1]?.linkText === "string"
      ? (breadcrumbs[breadcrumbs.length - 1].linkText as string)
      : null;

  const images = Array.isArray(item.images) ? (item.images as Record<string, unknown>[]) : [];
  const photos = images
    .map((img) => ({
      url: typeof img.imageUrl === "string" ? img.imageUrl : "",
      caption: truncateToLastWord(typeof img.caption === "string" ? img.caption : "", CAPTION_MAX_LENGTH),
    }))
    .filter((p) => p.url);

  // `images[]` n'est pas dans l'ordre d'affichage réel d'Airbnb (vérifié sur
  // un import réel : la vraie couverture s'y trouvait à l'index 54, pas 0) —
  // `thumbnail` est un champ séparé qui reflète fidèlement la vraie
  // couverture Airbnb. Sans lui, on retombe sur images[0] (comportement
  // inchangé).
  const thumbnailUrl = typeof item.thumbnail === "string" ? item.thumbnail.trim() : "";
  if (thumbnailUrl) {
    const existingIdx = photos.findIndex((p) => p.url === thumbnailUrl);
    const cover = existingIdx >= 0 ? photos.splice(existingIdx, 1)[0] : { url: thumbnailUrl, caption: "" };
    photos.unshift(cover);
  }

  // Le prix n'est renvoyé que si checkIn/checkOut sont fournis en input —
  // forme exacte non confirmée sur un run réel avec dates, donc extraction
  // défensive plutôt que de présumer une forme précise.
  let priceLow: number | null = null;
  const priceField = item.price;
  if (typeof priceField === "number") {
    priceLow = priceField;
  } else if (priceField && typeof priceField === "object") {
    const p = priceField as Record<string, unknown>;
    priceLow = toNumberOrNull(p.amount ?? p.value ?? p.rate ?? p.total);
  }

  const coordinates = (item.coordinates as Record<string, unknown>) ?? {};

  return {
    title: typeof item.title === "string" ? item.title : null,
    description: typeof item.description === "string" ? item.description : null,
    photos,
    capacity: toNumberOrNull(item.personCapacity),
    bedrooms: bedroomsMatch ? Number(bedroomsMatch[1]) : null,
    bathrooms: bathroomsMatch ? Number(bathroomsMatch[1]) : null,
    amenities: matched,
    city: typeof item.location === "string" ? item.location : null,
    region: matchRegion(regionCandidate),
    latitude: toNumberOrNull(coordinates.latitude),
    longitude: toNumberOrNull(coordinates.longitude),
    priceLow,
    rawAmenities: unmatched,
    rawRegionCandidate: regionCandidate,
  };
}

// ── VRBO — actor one-api/vrbo-scraper ────────────────────────────────────────
// Le dataset item a des colonnes "à plat" (Name, Address, Photos...) qui se
// sont avérées peu fiables sur un vrai run (ex. "Photos"/"Photo Count" sont
// en fait une vignette de carte Google Maps, pas la galerie). Les vraies
// données structurées vivent dans `Raw`, une chaîne JSON à re-parser :
// title, description, location{address,latitude,longitude}, rooms{bedrooms,
// sleeps}, amenities.categories[].items[].label, photos[].url (filtrer
// maps.googleapis.com), price{perNight,current,total}.
export function mapVrboItem(flatItem: Record<string, unknown>): ImportedListingData {
  let raw: Record<string, unknown> = {};
  try {
    raw =
      typeof flatItem.Raw === "string"
        ? (JSON.parse(flatItem.Raw) as Record<string, unknown>)
        : ((flatItem.Raw as Record<string, unknown>) ?? {});
  } catch {
    raw = {};
  }

  const photosRaw = Array.isArray(raw.photos) ? (raw.photos as unknown[]) : [];
  const photos = photosRaw
    .map((p) => (typeof p === "string" ? p : (p as Record<string, unknown>)?.url))
    .filter((url): url is string => typeof url === "string" && url.length > 0 && !url.includes("maps.googleapis.com"))
    .map((url) => ({ url, caption: "" }));

  const amenitiesObj = (raw.amenities as Record<string, unknown>) ?? {};
  const categories = Array.isArray(amenitiesObj.categories) ? (amenitiesObj.categories as Record<string, unknown>[]) : [];
  const rawAmenityLabels = categories
    .flatMap((cat) => (Array.isArray(cat.items) ? (cat.items as Record<string, unknown>[]) : []))
    .map((i) => (typeof i.label === "string" ? i.label : null))
    .filter((v): v is string => !!v);
  const { matched, unmatched } = matchAmenities(rawAmenityLabels);

  const location = (raw.location as Record<string, unknown>) ?? {};
  const address = typeof location.address === "string" ? location.address : null;
  const city = address ? address.split(",")[0]?.trim() || null : null;

  const rooms = (raw.rooms as Record<string, unknown>) ?? {};

  const priceObj = (raw.price as Record<string, unknown>) ?? {};
  const priceLow = toNumberOrNull(priceObj.perNight ?? priceObj.current ?? priceObj.total);

  // Pas de champ "salles de bain" structuré sur cet actor — best-effort dans
  // la description brute, sinon laissé vide (à corriger en révision).
  const description = typeof raw.description === "string" ? raw.description : null;
  const bathroomsMatch = description?.match(/(\d+)\s*(?:salles?\s*de\s*bain|bathrooms?)/i) ?? null;

  return {
    title: typeof raw.title === "string" ? raw.title : null,
    description,
    photos,
    capacity: toNumberOrNull(rooms.sleeps),
    bedrooms: toNumberOrNull(rooms.bedrooms),
    bathrooms: bathroomsMatch ? Number(bathroomsMatch[1]) : null,
    amenities: matched,
    city,
    // VRBO ne fournit pas de nom de région (Laurentides, Charlevoix, etc.),
    // seulement une adresse ville/province — le mapping échoue le plus
    // souvent, volontairement laissé à la révision manuelle.
    region: matchRegion(city),
    latitude: toNumberOrNull(location.latitude),
    longitude: toNumberOrNull(location.longitude),
    priceLow,
    rawAmenities: unmatched,
    rawRegionCandidate: address,
  };
}
