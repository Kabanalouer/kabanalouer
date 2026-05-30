import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");

  const region = searchParams.get("region") || undefined;
  const city = searchParams.get("city") || undefined;
  const capacity = searchParams.get("capacity") || undefined;
  const checkin = searchParams.get("checkin") || undefined;
  const checkout = searchParams.get("checkout") || undefined;
  const minBedrooms = searchParams.get("minBedrooms") || undefined;
  const minBeds = searchParams.get("minBeds") || undefined;
  const minBathrooms = searchParams.get("minBathrooms") || undefined;
  const amenitiesParam = searchParams.get("amenities") || undefined;
  const amenityList = amenitiesParam ? amenitiesParam.split(",").filter(Boolean) : [];

  const supabase = await createClient();

  // Availability exclusion
  let excludedIds: string[] = [];
  if (checkin && checkout && checkin < checkout) {
    const { data: blocked } = await supabase
      .from("availability")
      .select("listing_id")
      .gte("date", checkin)
      .lt("date", checkout)
      .eq("is_blocked", true);
    excludedIds = [...new Set((blocked ?? []).map((b) => b.listing_id as string))];
  }

  let query = supabase
    .from("listings")
    .select("id, title, region, city, capacity, bedrooms, bathrooms, price_low, price_on_request, photos, amenities, latitude, longitude, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
    query = query
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng);
  }

  if (region) query = query.eq("region", region);
  if (city) query = query.eq("city", city);
  if (capacity) query = query.gte("capacity", parseInt(capacity));
  if (minBedrooms) query = query.gte("bedrooms", parseInt(minBedrooms));
  if (minBathrooms) query = query.gte("bathrooms", parseInt(minBathrooms));
  if (amenityList.length > 0) query = query.contains("amenities", amenityList);
  if (excludedIds.length > 0) query = query.not("id", "in", `(${excludedIds.join(",")})`);

  const { data: rows } = await query;

  if (!rows || rows.length === 0) return NextResponse.json([]);

  const listingIds = rows.map((r) => r.id as string);

  // Rooms for bed counts + favorites in parallel
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: allRooms }, { data: favs }] = await Promise.all([
    supabase.from("rooms").select("listing_id, type, beds").in("listing_id", listingIds),
    user
      ? supabase.from("favorites").select("listing_id").eq("user_id", user.id).in("listing_id", listingIds)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
  ]);

  const roomsByListing: Record<string, { type: string; beds: unknown }[]> = {};
  for (const room of allRooms ?? []) {
    const lid = room.listing_id as string;
    if (!roomsByListing[lid]) roomsByListing[lid] = [];
    roomsByListing[lid].push(room as { type: string; beds: unknown });
  }

  const favSet = new Set((favs ?? []).map((f) => (f as { listing_id: string }).listing_id));

  const today = new Date().toISOString().split("T")[0];
  const { data: activePromos } = await supabase
    .from("promotions")
    .select("listing_id")
    .in("listing_id", listingIds)
    .eq("is_active", true)
    .or(`type.eq.lastminute,and(start_date.lte.${today},end_date.gte.${today})`);
  const promoSet = new Set((activePromos ?? []).map((p) => p.listing_id as string));

  const listings = rows.map((row) => {
    const id = row.id as string;
    const rooms = roomsByListing[id];
    let beds: number | null = null;
    if (rooms && rooms.length > 0) {
      const bedroomBeds = rooms
        .filter((r) => r.type === "bedroom")
        .reduce((sum, room) => {
          const b = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
          return sum + b.filter((x) => x.type !== "sofa_bed").reduce((s, x) => s + x.quantity, 0);
        }, 0);
      const sofaBeds = rooms
        .filter((r) => r.type === "living_room")
        .reduce((sum, room) => {
          const b = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
          return sum + b.filter((x) => x.type === "sofa_bed").reduce((s, x) => s + x.quantity, 0);
        }, 0);
      beds = bedroomBeds + sofaBeds || null;
    }

    return {
      id,
      title: row.title as string,
      region: row.region as string,
      city: (row.city as string | null) ?? null,
      price: row.price_low as number,
      priceOnRequest: !!(row.price_on_request),
      capacity: row.capacity as number,
      bedrooms: row.bedrooms as number,
      beds,
      photos: normalizePhotos(row.photos).slice(0, 5).map((p) => p.url),
      isFavorite: favSet.has(id),
      tags: Array.isArray(row.amenities) ? (row.amenities as string[]).slice(0, 3) : [],
      hasPromo: promoSet.has(id),
      lat: (row.latitude as number | null) ?? null,
      lng: (row.longitude as number | null) ?? null,
    };
  });

  const minBedsNum = minBeds ? parseInt(minBeds) : null;
  const filtered = minBedsNum
    ? listings.filter((l) => l.beds !== null && l.beds >= minBedsNum)
    : listings;

  return NextResponse.json(filtered);
}
