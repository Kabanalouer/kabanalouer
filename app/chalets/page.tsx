import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FilterBar from "@/components/chalets/FilterBar";
import ListingCard, { type Listing } from "@/components/ListingCard";

export const metadata = {
  title: "Chalets à louer au Québec — Kabanalouer",
  description:
    "Parcourez des centaines de chalets au Québec. Filtrez par région, capacité et équipements. Contact direct avec les propriétaires.",
};

interface PageProps {
  searchParams: Promise<{
    region?: string;
    capacity?: string;
    amenity?: string;
  }>;
}

async function ListingsGrid({
  region,
  capacity,
  amenity,
}: {
  region?: string;
  capacity?: string;
  amenity?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("id, title, region, capacity, bedrooms, price_low, photos, amenities, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(48);

  if (region) query = query.eq("region", region);
  if (capacity) query = query.gte("capacity", parseInt(capacity));
  if (amenity) query = query.contains("amenities", [amenity]);

  const { data: rows } = await query;

  if (!rows || rows.length === 0) {
    return (
      <div className="col-span-3 py-24 text-center">
        <p className="text-5xl mb-4">🏕️</p>
        <h3 className="font-semibold text-gray-900 mb-2">Aucun chalet trouvé</h3>
        <p className="text-gray-500 text-sm">
          Essayez avec d&apos;autres filtres ou revenez bientôt — de nouveaux chalets s&apos;ajoutent chaque semaine.
        </p>
      </div>
    );
  }

  const listings: Listing[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    region: row.region,
    price: row.price_low,
    rating: 0,
    reviewCount: 0,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    photo:
      Array.isArray(row.photos) && row.photos.length > 0
        ? row.photos[0]
        : "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
    tags: Array.isArray(row.amenities) ? row.amenities.slice(0, 3) : [],
  }));

  return (
    <>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </>
  );
}

export default async function ChaletsPage({ searchParams }: PageProps) {
  const { region, capacity, amenity } = await searchParams;

  const activeFilters = [region, capacity && `${capacity}+ pers.`, amenity]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chalets au Québec</h1>
            {activeFilters && (
              <p className="text-sm text-gray-500 mt-0.5">{activeFilters}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Suspense
            fallback={
              <>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-100 rounded-2xl aspect-[4/3] animate-pulse"
                  />
                ))}
              </>
            }
          >
            <ListingsGrid region={region} capacity={capacity} amenity={amenity} />
          </Suspense>
        </div>
      </div>

      <Footer />
    </div>
  );
}
