import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { normalizePhotos } from "@/lib/photo";
import { THEME_AMENITY_IDS, sortRows, type ThemeRow } from "@/lib/themeStats";

// Lecture des fiches d'un thème pour les pages thème (cache 24 h, comme demandé). Client service, côté serveur
// seulement : le courriel au dossier (privé) sert uniquement à repérer un même exploitant, il n'est jamais renvoyé.

type Raw = Record<string, unknown>;

type AmenityEntry = { id?: unknown; details?: Record<string, unknown> };

function amenityEntries(amenities: unknown): AmenityEntry[] {
  return Array.isArray(amenities) ? (amenities.filter((a) => a && typeof a === "object") as AmenityEntry[]) : [];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function rowFromDb(raw: Raw): ThemeRow {
  const entries = amenityEntries(raw.amenities);
  const lakeEntry = entries.find((a) => a.id === "acces-lac");
  const boatsEntry = entries.find((a) => a.id === "embarcations");
  const acces = str(lakeEntry?.details?.acces);
  const lakeBoatsFree = lakeEntry?.details?.locationEmbarcations === true && lakeEntry?.details?.gratuitPayant === "Gratuit";
  const boatsFree = boatsEntry?.details?.gratuitPayant === "Gratuit";
  const spaEntry = entries.find((a) => a.id === "spa");
  const spaAcces = str(spaEntry?.details?.acces);
  const spaCap = Number(spaEntry?.details?.capacite);
  const spaYear = spaEntry?.details?.disponibleAnnee;
  const site = str(raw.site_name);
  const email = str(raw.claim_email);
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    titleEn: str(raw.title_en),
    region: String(raw.region ?? ""),
    city: str(raw.city),
    price: Number(raw.price_low),
    priceOnRequest: !!raw.price_on_request,
    capacity: Number(raw.capacity),
    bedrooms: Number(raw.bedrooms),
    // 5 premières photos : la carte n'en montre pas plus et le cache reste léger
    photos: normalizePhotos(raw.photos).slice(0, 5).map((p) => p.url),
    listingNumber: typeof raw.listing_number === "number" ? raw.listing_number : null,
    customSlug: str(raw.custom_slug),
    lat: typeof raw.latitude === "number" ? raw.latitude : null,
    lng: typeof raw.longitude === "number" ? raw.longitude : null,
    rank: Number(raw.unclaimed_rank ?? 0),
    score: Number(raw.score ?? 0),
    createdAt: String(raw.created_at ?? ""),
    ownerKey: (site ?? email ?? String(raw.host_id ?? raw.id)).toLowerCase(),
    direct: entries.some((a) => a.id === "bord-eau"),
    lake: !!lakeEntry,
    lakeAccess: acces === "Privé" ? "prive" : acces === "Public" ? "public" : null,
    beach: lakeEntry?.details?.plage === true,
    boats: lakeBoatsFree || boatsFree,
    dogs: raw.dogs_allowed === true,
    spa: !!spaEntry,
    spaAccess: spaAcces === "Privé" ? "prive" : spaAcces === "Partagé" ? "partage" : null,
    spaPlaces: Number.isFinite(spaCap) && spaCap > 0 ? spaCap : null,
    spaYear: typeof spaYear === "boolean" ? spaYear : null,
    sauna: entries.some((a) => a.id === "sauna"),
  };
}

export function rowMatchesTheme(r: ThemeRow, slug: string): boolean {
  const ids = THEME_AMENITY_IDS[slug] ?? [];
  return (ids.includes("bord-eau") && r.direct) || (ids.includes("acces-lac") && r.lake) || (ids.includes("spa") && r.spa);
}

const COLUMNS =
  "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug, unclaimed_rank, score, created_at, site_name, claim_email, host_id, dogs_allowed, latitude, longitude";

async function fetchThemeRows(slug: string): Promise<{ rows: ThemeRow[]; updatedAt: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  // Quelques centaines de fiches publiées : une page de résultats suffit (limite PostgREST : 1000).
  const { data, error } = await supabase
    .from("listings")
    .select(COLUMNS)
    .eq("is_published", true)
    .eq("is_test", false)
    .limit(1000);
  if (error) console.error("themeData: erreur Supabase", error);
  const rows = ((data ?? []) as unknown as Raw[]).map(rowFromDb).filter((r) => rowMatchesTheme(r, slug));
  return { rows: sortRows(rows), updatedAt: new Date().toISOString() };
}

// Même données pour tous les visiteurs : mises en cache 24 h (l'argument `slug` fait partie de la clé).
export const getThemeData = unstable_cache(fetchThemeRows, ["theme-data-v2"], { revalidate: 86400 });
