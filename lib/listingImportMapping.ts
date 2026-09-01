// Mappe les données brutes des actors Apify (Airbnb, VRBO) vers les champs
// de `listings`. Vérifié contre de vraies réponses d'actor (pas de schéma
// deviné) — voir le rapport d'exploration pour le détail des formats.
//
// `amenities` et `region` sur `listings` sont des listes fermées (voir
// lib/amenities.ts et lib/regions.ts) — le texte scrapé ne matche jamais
// exactement, donc tout passe par un mapping best-effort par mots-clés. Ce
// qui ne matche rien est conservé dans `rawAmenities`/`rawRegionCandidate`
// pour révision admin plutôt que d'être perdu silencieusement.

import { AMENITIES } from "@/lib/amenities";
import { REGIONS } from "@/lib/regions";

export type ImportedListingData = {
  title: string | null;
  description: string | null;
  photos: { url: string; caption: string }[];
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  priceLow: number | null;
  rawAmenities: string[];
  rawRegionCandidate: string | null;
};

// Mots-clés (FR + EN, en minuscules) associés à chaque valeur de la liste
// fermée AMENITIES. Best-effort — pas exhaustif, complété au besoin si des
// imports réels révèlent des libellés non reconnus.
const AMENITY_KEYWORDS: Record<(typeof AMENITIES)[number], string[]> = {
  "Bord de l'eau": ["waterfront", "bord de l'eau", "lakefront", "lake access", "accès à l'eau"],
  "Piscine intérieure": ["indoor pool", "piscine intérieure"],
  "Piscine extérieure": ["outdoor pool", "piscine extérieure", "pool"],
  "Ski in / Ski out": ["ski in", "ski-in", "ski out", "ski-out"],
  "Situé sur un resort": ["resort"],
  "Spa": ["hot tub", "spa", "jacuzzi"],
  "Sauna": ["sauna"],
  "Chalet en bois rond": ["log cabin", "bois rond"],
  "Foyer intérieur au bois": ["wood fireplace", "wood-burning fireplace", "foyer intérieur", "indoor fireplace"],
  "Foyer extérieur (firepit)": ["fire pit", "firepit", "foyer extérieur", "outdoor fireplace"],
  "BBQ": ["bbq", "barbecue", "grill"],
  "Table de billard": ["pool table", "billiard", "billard"],
  "Babyfoot": ["foosball", "babyfoot"],
  "Table de ping-pong": ["ping pong", "ping-pong", "table tennis"],
  "Arcades": ["arcade"],
  "Jeux de société": ["board game", "jeux de société"],
  "Livres et Revues": ["books", "magazines", "livres et revues"],
  "Gym": ["gym", "fitness", "exercise equipment"],
  "Wifi": ["wifi", "wi-fi", "wireless internet"],
  "Espace de travail dédié (télétravail)": ["workspace", "espace de travail", "dedicated workspace"],
  "Climatisation": ["air conditioning", "climatisation", "a/c", "ac unit"],
  "Télévision avec câble": ["cable tv"],
  "Télévision intelligente": ["smart tv"],
  "Système audio (musique)": ["sound system"],
  "Cuisine complète avec vaisselle et chaudrons": ["kitchen", "cuisine"],
  "Literie et serviettes incluses": ["linens", "towels", "literie", "serviettes"],
  "Buanderie": ["washer", "dryer", "laundry", "laveuse", "sécheuse", "buanderie"],
  "Terrasse": ["deck", "terrace", "terrasse", "patio"],
  "Module de jeux pour enfant": ["play area", "playground", "module de jeux"],
  "Borne de recharge pour véhicule électrique": ["ev charg", "electric vehicle", "borne de recharge"],
};

export function matchAmenities(rawLabels: string[]): { matched: string[]; unmatched: string[] } {
  const matched = new Set<string>();
  const unmatched: string[] = [];

  for (const raw of rawLabels) {
    if (!raw) continue;
    const norm = raw.toLowerCase();
    let found = false;
    for (const canonical of AMENITIES) {
      const keywords = AMENITY_KEYWORDS[canonical] ?? [];
      if (keywords.some((k) => norm.includes(k))) {
        matched.add(canonical);
        found = true;
        break;
      }
    }
    if (!found) unmatched.push(raw);
  }

  return { matched: Array.from(matched), unmatched };
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
      caption: typeof img.caption === "string" ? img.caption : "",
    }))
    .filter((p) => p.url);

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
