import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/lib/listingScore";
import { firstPhotoUrl } from "@/lib/photo";
import AdminListingsClient, { type ListingRow } from "@/components/admin/AdminListingsClient";

export const metadata = { title: "Annonces — Administration" };

export default async function AdminListingsPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [{ data: listings }, { data: rooms }, { data: futureAvail }, { data: reviews }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, host:host_id(id, name, bio, avatar_url)")
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("listing_id, photos"),
    supabase.from("availability").select("listing_id").gte("date", today).eq("source", "manual"),
    supabase.from("reviews").select("listing_id, created_at"),
  ]);

  // Build lookup structures
  const roomsPerListing = new Map<string, { photos: unknown }[]>();
  for (const room of (rooms ?? [])) {
    const arr = roomsPerListing.get(room.listing_id) ?? [];
    arr.push(room);
    roomsPerListing.set(room.listing_id, arr);
  }

  const futureAvailSet = new Set((futureAvail ?? []).map((a) => a.listing_id as string));

  const reviewCounts = new Map<string, { total: number; recent: number }>();
  for (const r of (reviews ?? [])) {
    const pc = reviewCounts.get(r.listing_id) ?? { total: 0, recent: 0 };
    reviewCounts.set(r.listing_id, {
      total: pc.total + 1,
      recent: pc.recent + (new Date(r.created_at) >= sixMonthsAgo ? 1 : 0),
    });
  }

  // Build rows
  const rows: ListingRow[] = (listings ?? []).map((listing) => {
    const id = listing.id as string;

    const hostRaw = listing.host;
    const host = Array.isArray(hostRaw) ? (hostRaw[0] as { name: string; bio: string | null; avatar_url: string | null } | undefined) : (hostRaw as { name: string; bio: string | null; avatar_url: string | null } | null);

    const photoList = Array.isArray(listing.photos) ? listing.photos as string[] : [];
    const listingRooms = roomsPerListing.get(id) ?? [];
    const roomsAllHavePhotos = listingRooms.length > 0 && listingRooms.every((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0);
    const rc = reviewCounts.get(id) ?? { total: 0, recent: 0 };

    const score = computeScore({
      photoCount: photoList.length,
      title: (listing.title as string) ?? "",
      description: (listing.description as string) ?? "",
      amenities: Array.isArray(listing.amenities) ? listing.amenities as string[] : [],
      nearbyActivities: Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [],
      citqNumber: (listing.citq_number as string) ?? "",
      icalUrl: (listing.ical_url as string | null) ?? null,
      hasFutureBlocked: futureAvailSet.has(id),
      roomsAllHavePhotos,
      bioFilled: !!host?.bio?.trim(),
      avatarFilled: !!host?.avatar_url?.trim(),
      reviewCount: rc.total,
      recentReviewCount: rc.recent,
    });

    return {
      id,
      title: (listing.title as string) ?? "",
      region: (listing.region as string) ?? "",
      photoUrl: firstPhotoUrl(listing.photos) ?? null,
      isPublished: !!(listing.is_published as boolean),
      createdAt: (listing.created_at as string) ?? "",
      score,
      hostName: host?.name ?? "—",
    };
  });

  const regions = [...new Set(rows.map((r) => r.region).filter(Boolean))].sort();

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-800">Annonces</h1>
          <p className="text-sm text-charcoal-400 mt-0.5">{rows.length} annonce{rows.length !== 1 ? "s" : ""} au total</p>
        </div>
      </div>
      <AdminListingsClient listings={rows} regions={regions} />
    </div>
  );
}
