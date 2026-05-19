import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { normalizePhotos } from "@/lib/photo";

export const metadata = {
  title: "Mes favoris — Kabanalouer",
};

export default async function FavorisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch favorite listing IDs
  const { data: favorites } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favListingIds = (favorites ?? []).map((f) => f.listing_id as string);

  let listings: Listing[] = [];

  if (favListingIds.length > 0) {
    // Fetch listing data
    const { data: rows } = await supabase
      .from("listings")
      .select("id, title, region, city, capacity, bedrooms, price_low, price_on_request, photos, amenities")
      .in("id", favListingIds)
      .eq("is_published", true);

    if (rows && rows.length > 0) {
      // Fetch rooms for bed counts
      const { data: allRooms } = await supabase
        .from("rooms")
        .select("listing_id, type, beds")
        .in("listing_id", rows.map((r) => r.id as string));

      const roomsByListing: Record<string, { type: string; beds: unknown }[]> = {};
      for (const room of allRooms ?? []) {
        const lid = room.listing_id as string;
        if (!roomsByListing[lid]) roomsByListing[lid] = [];
        roomsByListing[lid].push(room as { type: string; beds: unknown });
      }

      const bedsByListing: Record<string, number | null> = {};
      for (const row of rows) {
        const id = row.id as string;
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
        bedsByListing[id] = bedroomBeds + sofaBeds;
      }

      // Preserve favorites order
      const rowMap = new Map(rows.map((r) => [r.id as string, r]));
      listings = favListingIds
        .map((id) => rowMap.get(id))
        .filter((row): row is NonNullable<typeof row> => !!row)
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
          isFavorite: true,
          tags: Array.isArray(row.amenities) ? (row.amenities as string[]).slice(0, 3) : [],
        }));
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Mes favoris</h1>

        {listings.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-5xl mb-4">🤍</p>
            <p className="text-gray-700 font-medium mb-2">
              Vous n&apos;avez pas encore de favoris.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Explorez nos chalets et cliquez sur ❤️ pour les sauvegarder.
            </p>
            <Link
              href="/chalets"
              className="inline-block bg-primary text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Explorer les chalets
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user.id} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
