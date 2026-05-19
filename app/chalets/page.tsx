import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FilterBar from "@/components/chalets/FilterBar";
import ChaletsMapLayout, { type ListingForMap } from "@/components/chalets/ChaletsMapLayout";
import SearchBar from "@/components/SearchBar";
import { normalizePhotos } from "@/lib/photo";

export const metadata = {
  title: "Chalets à louer au Québec — Kabanalouer",
  description:
    "Parcourez des centaines de chalets au Québec. Filtrez par région, capacité et équipements. Contact direct avec les propriétaires.",
};

interface PageProps {
  searchParams: Promise<{
    region?: string;
    city?: string;
    capacity?: string;
    amenity?: string;
    checkin?: string;
    checkout?: string;
  }>;
}

export default async function ChaletsPage({ searchParams }: PageProps) {
  const { region, city, capacity, amenity, checkin, checkout } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    .select("id, title, region, city, capacity, bedrooms, price_low, price_on_request, photos, amenities, latitude, longitude, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(48);

  if (region) query = query.eq("region", region);
  if (city) query = query.eq("city", city);
  if (capacity) query = query.gte("capacity", parseInt(capacity));
  if (amenity) query = query.contains("amenities", [amenity]);
  if (excludedIds.length > 0) query = query.not("id", "in", `(${excludedIds.join(",")})`);

  const { data: rows } = await query;

  let listings: ListingForMap[] = [];

  if (rows && rows.length > 0) {
    const listingIds = rows.map((r) => r.id as string);

    // Rooms for bed counts + favorites in parallel
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

    const bedsByListing: Record<string, number | null> = {};
    for (const id of listingIds) {
      const rooms = roomsByListing[id];
      if (!rooms || rooms.length === 0) { bedsByListing[id] = null; continue; }
      const bedroomBeds = rooms
        .filter((r) => r.type === "bedroom")
        .reduce((sum, room) => {
          const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
          return sum + beds.filter((b) => b.type !== "sofa_bed").reduce((s, b) => s + b.quantity, 0);
        }, 0);
      const sofaBeds = rooms
        .filter((r) => r.type === "living_room")
        .reduce((sum, room) => {
          const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
          return sum + beds.filter((b) => b.type === "sofa_bed").reduce((s, b) => s + b.quantity, 0);
        }, 0);
      bedsByListing[id] = bedroomBeds + sofaBeds || null;
    }

    const favSet = new Set((favs ?? []).map((f) => (f as { listing_id: string }).listing_id));

    listings = rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      region: row.region as string,
      city: (row.city as string | null) ?? null,
      price: row.price_low as number,
      priceOnRequest: !!(row.price_on_request),
      capacity: row.capacity as number,
      bedrooms: row.bedrooms as number,
      beds: bedsByListing[row.id as string] ?? null,
      photos: normalizePhotos(row.photos).slice(0, 5).map((p) => p.url),
      isFavorite: favSet.has(row.id as string),
      tags: Array.isArray(row.amenities) ? (row.amenities as string[]).slice(0, 3) : [],
      lat: (row.latitude as number | null) ?? null,
      lng: (row.longitude as number | null) ?? null,
    }));
  }

  const activeFilters = [
    region,
    city,
    capacity && `${capacity}+ pers.`,
    amenity,
    checkin && checkout ? `${checkin} → ${checkout}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const initialGuests = capacity
    ? parseInt(capacity) >= 25 ? "25+" : capacity
    : undefined;

  return (
    <div className="flex flex-col lg:h-screen">
      <Navbar />

      {/* Search bar pre-filled with current filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex justify-center">
        <SearchBar
          initialRegion={region}
          initialCity={city}
          initialCheckin={checkin}
          initialCheckout={checkout}
          initialGuests={initialGuests}
          iconOnly
        />
      </div>

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {/* flex-1 fills remaining height; overflow-hidden on desktop clips the split layout */}
      <div className="flex-1 lg:overflow-hidden">
        <ChaletsMapLayout
          initialListings={listings}
          currentUserId={user?.id ?? null}
          filters={{ region, city, capacity, amenity, checkin, checkout }}
          activeFilters={activeFilters || undefined}
        />
      </div>

      {/* Footer only on mobile (map fills the screen on desktop) */}
      <div className="lg:hidden">
        <Footer />
      </div>
    </div>
  );
}
