import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChaletsMapLayout, { type ListingForMap } from "@/components/chalets/ChaletsMapLayout";
import { normalizePhotos } from "@/lib/photo";
import type { Metadata } from "next";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { city, region } = await searchParams;
  const destination = city || region || null;

  if (destination) {
    return {
      title: `Chalets à louer à ${destination} | Kabanalouer`,
      description: `Trouvez et réservez les meilleurs chalets à louer à ${destination}. Contactez directement les propriétaires, sans commission.`,
      alternates: { canonical: "/chalets" },
      openGraph: {
        title: `Chalets à louer à ${destination} | Kabanalouer`,
        description: `Trouvez et réservez les meilleurs chalets à louer à ${destination}. Contactez directement les propriétaires, sans commission.`,
        url: "/chalets",
      },
      twitter: {
        title: `Chalets à louer à ${destination} | Kabanalouer`,
        description: `Trouvez et réservez les meilleurs chalets à louer à ${destination}. Contactez directement les propriétaires, sans commission.`,
      },
    };
  }

  return {
    title: "Chalets à louer au Québec | Kabanalouer",
    description:
      "Trouvez votre chalet idéal au Québec. Filtrez par région, dates et équipements. Disponibilités en temps réel.",
    alternates: { canonical: "/chalets" },
    openGraph: {
      title: "Chalets à louer au Québec | Kabanalouer",
      description: "Trouvez votre chalet idéal au Québec. Filtrez par région, dates et équipements. Disponibilités en temps réel.",
      url: "/chalets",
    },
    twitter: {
      title: "Chalets à louer au Québec | Kabanalouer",
      description: "Trouvez votre chalet idéal au Québec. Filtrez par région, dates et équipements.",
    },
  };
}

interface PageProps {
  searchParams: Promise<{
    region?: string;
    city?: string;
    capacity?: string;
    checkin?: string;
    checkout?: string;
    minBedrooms?: string;
    minBeds?: string;
    minBathrooms?: string;
    amenities?: string;
  }>;
}

export default async function ChaletsPage({ searchParams }: PageProps) {
  const {
    region, city, capacity, checkin, checkout,
    minBedrooms, minBeds, minBathrooms, amenities,
  } = await searchParams;

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
    .select("id, title, region, city, capacity, bedrooms, bathrooms, price_low, price_on_request, photos, amenities, latitude, longitude, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(48);

  if (region) query = query.eq("region", region);
  if (city) query = query.eq("city", city);
  if (capacity) query = query.gte("capacity", parseInt(capacity));
  if (minBedrooms) query = query.gte("bedrooms", parseInt(minBedrooms));
  if (minBathrooms) query = query.gte("bathrooms", parseInt(minBathrooms));
  if (amenities) {
    const amenityList = amenities.split(",").filter(Boolean);
    if (amenityList.length > 0) query = query.contains("amenities", amenityList);
  }
  if (excludedIds.length > 0) query = query.not("id", "in", `(${excludedIds.join(",")})`);

  const { data: rows } = await query;

  let listings: ListingForMap[] = [];

  if (rows && rows.length > 0) {
    const listingIds = rows.map((r) => r.id as string);

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
    const minBedsNum = minBeds ? parseInt(minBeds) : null;

    listings = rows
      .filter((row) => {
        if (!minBedsNum) return true;
        const beds = bedsByListing[row.id as string];
        return beds !== null && beds >= minBedsNum;
      })
      .map((row) => ({
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

  const initialGuests = capacity
    ? parseInt(capacity) >= 25 ? "25+" : capacity
    : undefined;

  const preserveParams: Record<string, string> = {};
  if (minBedrooms) preserveParams.minBedrooms = minBedrooms;
  if (minBeds) preserveParams.minBeds = minBeds;
  if (minBathrooms) preserveParams.minBathrooms = minBathrooms;
  if (amenities) preserveParams.amenities = amenities;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <ChaletsMapLayout
          initialListings={listings}
          currentUserId={user?.id ?? null}
          filters={{ region, city, capacity, checkin, checkout, minBedrooms, minBeds, minBathrooms, amenities }}
        />
      </div>
      <Footer />
    </div>
  );
}
