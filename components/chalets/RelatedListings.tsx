import Link from "next/link";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

const RELATED_COUNT = 3;
const COLUMNS = "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug";

// Bas de fiche chalet : 3 autres chalets de la même ville (complétés par la
// région) + lien vers la page ville/région — maillage interne pour le SEO/GEO.
export default async function RelatedListings({
  listingId,
  city,
  region,
  cityPath,
  regionPath,
  regionName,
  locale,
  currentUserId,
  children,
}: {
  listingId: string;
  city: string | null;
  region: string | null;
  cityPath?: string;
  regionPath?: string;
  regionName: string;
  locale: string;
  currentUserId: string | null;
  // Suite du bloc « fin de fiche » (pastilles de pages semblables).
  children?: React.ReactNode;
}) {
  if (!region) return children ? <section className="mt-12 pt-12 border-t border-[#ebebeb] w-full">{children}</section> : null;
  const isEn = locale === "en";
  const supabase = await createClient();

  let rows: Record<string, unknown>[] = [];
  if (city) {
    const { data } = await supabase.from("listings").select(COLUMNS)
      .eq("is_published", true).eq("region", region).eq("city", city).neq("id", listingId)
      .order("created_at", { ascending: false }).limit(RELATED_COUNT);
    rows = data ?? [];
  }
  // Moins de 3 dans la ville : on complète avec la région (le titre garde la
  // ville tant qu'au moins un chalet en vient).
  const scope: "city" | "region" = rows.length > 0 ? "city" : "region";
  if (rows.length < RELATED_COUNT) {
    const exclude = [listingId, ...rows.map((r) => r.id as string)];
    const { data } = await supabase.from("listings").select(COLUMNS)
      .eq("is_published", true).eq("region", region).not("id", "in", `(${exclude.join(",")})`)
      .order("created_at", { ascending: false }).limit(RELATED_COUNT - rows.length);
    rows = [...rows, ...(data ?? [])];
  }
  if (rows.length === 0) {
    return children ? <section className="mt-12 pt-12 border-t border-[#ebebeb] w-full">{children}</section> : null;
  }

  const listings: Listing[] = rows.map((l) => ({
    id: l.id as string,
    title: ((isEn && (l.title_en as string | null)) || (l.title as string | null)) ?? "",
    region: (l.region as string | null) ?? "",
    city: (l.city as string | null) ?? null,
    listing_number: (l.listing_number as number | null) ?? null,
    custom_slug: (l.custom_slug as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? getAmenityLabels(l.amenities as AmenityValue[], locale).slice(0, 3) : [],
  }));

  const title = scope === "city" && city
    ? (isEn ? `Other cabins in ${city}` : `Autres chalets à ${city}`)
    : (isEn ? `Other cabins in ${regionName}` : `Autres chalets dans la région ${regionName}`);
  const moreHref = scope === "city" && cityPath ? cityPath : regionPath;
  const moreLabel = scope === "city" && city
    ? (isEn ? `Cabin rentals in ${city} →` : `Location de chalet à ${city} →`)
    : (isEn ? `Cabin rentals in ${regionName} →` : `Location de chalet ${regionName} →`);

  return (
    <section className="mt-12 pt-12 border-t border-[#ebebeb] w-full">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className={`text-sm ${TEXT_LINK_CLASSNAME}`}>{moreLabel}</Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} currentUserId={currentUserId} />
        ))}
      </div>
      {children}
    </section>
  );
}
