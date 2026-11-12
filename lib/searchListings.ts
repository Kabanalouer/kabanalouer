import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListingForMap } from "@/components/chalets/ChaletsMapLayout";
import { normalizePhotos } from "@/lib/photo";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { PROMO_DISPLAY_COLUMNS, visiblePromoFilter } from "@/lib/promoLabel";
import { PAGE_SIZE } from "@/lib/searchPaging";

// Recherche de chalets (/chalets et /api/listings/geo) : la liste est paginée côté serveur
// (une page = PAGE_SIZE fiches complètes), la carte épingle toutes les fiches de la recherche
// sous une forme légère (une photo, pas de chambres ni de promos).
// Plafond d'une réponse Supabase (1000 lignes) : au-delà, les épingles sont tronquées, pas la liste.
const MAX_PINS = 1000;
// Fiches par requête « .in(...) » : plus long, l'adresse de la requête devient trop grande et les
// 1000 lignes maximales d'une réponse tronqueraient les chambres.
const IN_CHUNK = 40;

type Row = Record<string, unknown>;
type RoomRow = { listing_id: string; type: string; beds: unknown };

// Avec une liste de colonnes calculée, Supabase ne type pas les lignes : on les relit comme des objets simples.
const asRows = (data: unknown): Row[] => (Array.isArray(data) ? (data as Row[]) : []);

const LIGHT_SELECT: string =
  "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, latitude, longitude, listing_number, custom_slug, site_name, first_photo:photos->0";
const FULL_SELECT: string =
  "id, title, title_en, region, city, capacity, bedrooms, bathrooms, price_low, price_on_request, photos, amenities, latitude, longitude, created_at, listing_number, custom_slug, site_name";

export interface SearchFilters {
  region?: string;
  city?: string;
  capacity?: string;
  checkin?: string;
  checkout?: string;
  minBedrooms?: string;
  minBeds?: string;
  minBathrooms?: string;
  amenities?: string;
  dogsCount?: number | null;
  accessibleOnly?: boolean;
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  locale: "fr" | "en";
}

export interface SearchResult {
  listings: ListingForMap[];
  pins: ListingForMap[];
  total: number;
  page: number;
  pageCount: number;
}

// Fiches dont une date du séjour est bloquée. Lu par tranches : une réponse Supabase s'arrête à
// 1000 lignes (une par date bloquée), ce qui laissait passer des fiches pourtant indisponibles.
async function blockedListingIds(supabase: SupabaseClient, checkin?: string, checkout?: string): Promise<string[]> {
  if (!(checkin && checkout && checkin < checkout)) return [];
  const ids = new Set<string>();
  const STEP = 1000;
  for (let from = 0; from < 50 * STEP; from += STEP) {
    const { data } = await supabase
      .from("availability")
      .select("listing_id")
      .gte("date", checkin)
      .lt("date", checkout)
      .eq("is_blocked", true)
      .order("listing_id")
      .order("date")
      .range(from, from + STEP - 1);
    for (const b of data ?? []) ids.add(b.listing_id as string);
    if (!data || data.length < STEP) break;
  }
  return [...ids];
}

function listingsQuery(supabase: SupabaseClient, f: SearchFilters, excludedIds: string[], select: string, withCount: boolean) {
  let query = supabase
    .from("listings")
    .select(select, withCount ? { count: "exact" } : undefined)
    .eq("is_published", true)
    .order("unclaimed_rank", { ascending: true })
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    // Départage final : sans lui, deux fiches à égalité pouvaient changer de page d'une requête à l'autre.
    .order("id", { ascending: true });

  if (f.bounds) {
    query = query
      .gte("latitude", f.bounds.minLat)
      .lte("latitude", f.bounds.maxLat)
      .gte("longitude", f.bounds.minLng)
      .lte("longitude", f.bounds.maxLng);
  }
  if (f.region) query = query.eq("region", f.region);
  if (f.city) query = query.eq("city", f.city);
  if (f.capacity) query = query.gte("capacity", parseInt(f.capacity));
  if (f.minBedrooms) query = query.gte("bedrooms", parseInt(f.minBedrooms));
  if (f.minBathrooms) query = query.gte("bathrooms", parseInt(f.minBathrooms));
  const amenityList = f.amenities ? f.amenities.split(",").filter(Boolean) : [];
  if (amenityList.length > 0) {
    // Chaîne JSON obligatoire : un tableau d'objets passé tel quel devient « {[object Object]} » dans l'URL PostgREST.
    query = query.contains("amenities", JSON.stringify(amenityList.map((id) => ({ id }))));
  }
  // Le nombre maximum de chiens est facultatif : une fiche qui n'en précise aucun reste dans les résultats
  if (f.dogsCount) query = query.eq("dogs_allowed", true).or(`dogs_max.is.null,dogs_max.gte.${f.dogsCount}`);
  if (f.accessibleOnly) query = query.eq("reduced_mobility", true);
  if (excludedIds.length > 0) query = query.not("id", "in", `(${excludedIds.join(",")})`);
  return query;
}

async function fetchRooms(supabase: SupabaseClient, ids: string[]): Promise<Record<string, RoomRow[]>> {
  const byListing: Record<string, RoomRow[]> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK));
  const results = await Promise.all(chunks.map((c) => supabase.from("rooms").select("listing_id, type, beds").in("listing_id", c)));
  for (const { data } of results) {
    for (const room of (data ?? []) as RoomRow[]) {
      (byListing[room.listing_id] ??= []).push(room);
    }
  }
  return byListing;
}

function countBeds(rooms: RoomRow[] | undefined): number | null {
  if (!rooms || rooms.length === 0) return null;
  const sum = (type: string, keep: (bedType: string) => boolean) =>
    rooms
      .filter((r) => r.type === type)
      .reduce((total, room) => {
        const beds = Array.isArray(room.beds) ? (room.beds as { type: string; quantity: number }[]) : [];
        return total + beds.filter((b) => keep(b.type)).reduce((s, b) => s + b.quantity, 0);
      }, 0);
  return sum("bedroom", (t) => t !== "sofa_bed") + sum("living_room", (t) => t === "sofa_bed") || null;
}

function baseFields(row: Row, locale: "fr" | "en") {
  return {
    id: row.id as string,
    title: (locale === "en" && (row.title_en as string | null)) || (row.title as string),
    region: row.region as string,
    city: (row.city as string | null) ?? null,
    listing_number: (row.listing_number as number | null) ?? null,
    custom_slug: (row.custom_slug as string | null) ?? null,
    siteName: (row.site_name as string | null) ?? null,
    price: row.price_low as number,
    priceOnRequest: !!row.price_on_request,
    capacity: row.capacity as number,
    bedrooms: row.bedrooms as number,
    lat: (row.latitude as number | null) ?? null,
    lng: (row.longitude as number | null) ?? null,
  };
}

function toPin(row: Row, locale: "fr" | "en"): ListingForMap {
  return {
    ...baseFields(row, locale),
    beds: null,
    photos: normalizePhotos(row.first_photo ? [row.first_photo] : []).map((p) => p.url),
    tags: [],
  };
}

export async function searchListings(
  supabase: SupabaseClient,
  userId: string | null,
  f: SearchFilters,
  requestedPage: number,
  includePins = true
): Promise<SearchResult> {
  const excludedIds = await blockedListingIds(supabase, f.checkin, f.checkout);
  const minBeds = f.minBeds ? parseInt(f.minBeds) : NaN;
  const filterByBeds = Number.isFinite(minBeds) && minBeds > 0;
  const wantedPage = Math.max(1, Math.floor(requestedPage) || 1);

  let pageRows: Row[] = [];
  let pins: ListingForMap[] = [];
  let total = 0;
  let page = wantedPage;
  let roomsByListing: Record<string, RoomRow[]> = {};

  if (filterByBeds) {
    // Le nombre de lits vient des chambres, pas d'une colonne : on filtre en code, puis on découpe en pages.
    const { data } = await listingsQuery(supabase, f, excludedIds, LIGHT_SELECT, false).limit(MAX_PINS);
    const lightRows = asRows(data);
    roomsByListing = await fetchRooms(supabase, lightRows.map((r) => r.id as string));
    const kept = lightRows.filter((r) => {
      const beds = countBeds(roomsByListing[r.id as string]);
      return beds !== null && beds >= minBeds;
    });
    total = kept.length;
    page = Math.min(wantedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    if (includePins) pins = kept.map((r) => toPin(r, f.locale));
    const pageIds = kept.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id as string);
    if (pageIds.length > 0) {
      const { data: full } = await supabase.from("listings").select(FULL_SELECT).in("id", pageIds);
      const byId = new Map(asRows(full).map((r) => [r.id as string, r]));
      pageRows = pageIds.map((id) => byId.get(id)).filter((r): r is Row => !!r);
    }
  } else {
    const runPage = async (p: number) => {
      const from = (p - 1) * PAGE_SIZE;
      return listingsQuery(supabase, f, excludedIds, FULL_SELECT, true).range(from, from + PAGE_SIZE - 1);
    };
    if (includePins) {
      // Le total connu d'abord, pour ramener une page trop grande (?page=99) à la dernière page.
      const { data, count } = await listingsQuery(supabase, f, excludedIds, LIGHT_SELECT, true).limit(MAX_PINS);
      pins = asRows(data).map((r) => toPin(r, f.locale));
      total = count ?? pins.length;
      page = Math.min(wantedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
      pageRows = asRows((await runPage(page)).data);
    } else {
      // Changement de page sans nouvelles épingles : une page hors limites (fiches retirées entre-temps)
      // retombe sur la première.
      let res = await runPage(page);
      if ((res.error || !res.data?.length) && page > 1) {
        page = 1;
        res = await runPage(1);
      }
      pageRows = asRows(res.data);
      total = res.count ?? pageRows.length;
    }
    roomsByListing = await fetchRooms(supabase, pageRows.map((r) => r.id as string));
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageRows.length === 0) return { listings: [], pins, total, page, pageCount };

  const pageIds = pageRows.map((r) => r.id as string);
  const today = new Date().toISOString().split("T")[0];
  const [{ data: favs }, { data: activePromos }] = await Promise.all([
    userId
      ? supabase.from("favorites").select("listing_id").eq("user_id", userId).in("listing_id", pageIds)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
    supabase
      .from("promotions")
      .select(`listing_id, ${PROMO_DISPLAY_COLUMNS}`)
      .in("listing_id", pageIds)
      .eq("is_active", true)
      .or(visiblePromoFilter(today)),
  ]);
  const favSet = new Set((favs ?? []).map((x) => (x as { listing_id: string }).listing_id));
  const promoMap = new Map((activePromos ?? []).map((p) => [p.listing_id as string, p]));

  const listings: ListingForMap[] = pageRows.map((row) => {
    const id = row.id as string;
    return {
      ...baseFields(row, f.locale),
      beds: countBeds(roomsByListing[id]),
      photos: normalizePhotos(row.photos).slice(0, 5).map((p) => p.url),
      isFavorite: favSet.has(id),
      tags: Array.isArray(row.amenities) ? getAmenityLabels(row.amenities as AmenityValue[], f.locale).slice(0, 3) : [],
      hasPromo: promoMap.has(id),
      promoData: promoMap.get(id) ?? null,
    };
  });

  return { listings, pins, total, page, pageCount };
}
