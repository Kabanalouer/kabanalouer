import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { isKnownMunicipality } from "@/lib/municipalities";
import { slugify } from "@/lib/slugify";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import { safeJsonLd } from "@/lib/jsonLd";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import type { RegionConfig } from "@/lib/regions";

// Pendant région-scopée de RegionLanding.tsx (même patron : props déjà
// résolues par le routeur parent, JSON-LD BreadcrumbList + ItemList,
// SearchBar, grille de ListingCard, style visuel identique). Remplace
// l'ancienne page ville non rattachée à une région (/chalets/ville/[slug]) —
// voir app/chalets/[...segments]/page.tsx pour la redirection des anciens
// liens vers le chemin canonique /chalets/région/ville.
export default async function CityLanding({
  regionConfig,
  cityName,
}: {
  regionConfig: RegionConfig;
  cityName: string;
}) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const displayRegionName = isEn ? regionConfig.nameEn : regionConfig.name;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const citySlug = slugify(cityName);
  const regionBasePath = isEn ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`;
  const cityBasePath = `${regionBasePath}/${citySlug}`;

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      "id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug"
    )
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .eq("city", cityName)
    .order("created_at", { ascending: false });

  const listings: Listing[] = (rawListings ?? []).map((l) => ({
    id: l.id,
    title: l.title ?? "",
    region: l.region ?? "",
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

  // Other cities in the same region
  const { data: regionCityData } = await supabase
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .not("city", "is", null);

  const otherCities = [
    ...new Set(
      (regionCityData ?? [])
        .map((d) => d.city as string)
        .filter((c) => c && c !== cityName)
        .filter(isKnownMunicipality) // jamais de lien vers une ville sans page dédiée
    ),
  ].slice(0, 10);

  const count = listings.length;

  // JSON-LD
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: isEn ? "Cabins" : "Chalets", item: `${SITE_URL}${localePath("/chalets", locale)}` },
    { "@type": "ListItem", position: 3, name: displayRegionName, item: `${SITE_URL}${regionBasePath}` },
    { "@type": "ListItem", position: 4, name: cityName, item: `${SITE_URL}${cityBasePath}` },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs,
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isEn ? `Cabins for rent in ${cityName}` : `Chalets à louer à ${cityName}`,
    numberOfItems: count,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${buildListingPath(
        { region: l.region, city: l.city ?? null, listing_number: l.listing_number ?? null, custom_slug: l.custom_slug ?? null },
        isEn ? "en" : "fr"
      ) ?? `/chalets/${l.id}`}`,
      name: l.title,
    })),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-charcoal-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-sm text-charcoal-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap">
            <Link href={localePath("/chalets", locale)} className="hover:text-primary hover:underline transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <Link href={regionBasePath} className="hover:text-primary hover:underline transition-colors">
              {displayRegionName}
            </Link>
            <span>›</span>
            <span className="text-charcoal-600">{cityName}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            {isEn ? `Cabins in ${cityName}` : `Chalets à ${cityName}`}
          </h1>
          <p className="text-charcoal-500 mb-8">
            {isEn
              ? `${count} cabin${count > 1 ? "s" : ""} available in ${cityName}, ${displayRegionName}`
              : `${count} chalet${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""} à ${cityName}, ${displayRegionName}`}
          </p>
          <div className="flex justify-center">
            <SearchBar initialCity={cityName} />
          </div>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-heading-2 font-bold text-charcoal-900">
              {isEn
                ? `${count} cabin${count > 1 ? "s" : ""} in ${cityName}`
                : `${count} chalet${count > 1 ? "s" : ""} à ${cityName}`}
            </h2>
            <p className="text-charcoal-500 mt-1 text-sm">
              {isEn ? "Direct contact · No service fees" : "Contact direct · Aucun frais de service"}
            </p>
          </div>
          <Link
            href={regionBasePath}
            className={`text-sm hidden md:block ${TEXT_LINK_CLASSNAME}`}
          >
            {isEn ? `See all cabins in ${displayRegionName} →` : `Voir tous les chalets ${regionConfig.locative} →`}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              currentUserId={user?.id ?? null}
            />
          ))}
        </div>
      </section>

      {/* ── Other cities in region ── */}
      {otherCities.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
            {isEn ? `Other cities in ${displayRegionName}` : `Autres villes ${regionConfig.locative}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCities.map((city) => (
              <Link
                key={city}
                href={`${regionBasePath}/${slugify(city)}`}
                className="px-4 py-2 rounded-full border border-charcoal-100 text-sm text-charcoal-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {city}
              </Link>
            ))}
            <Link
              href={regionBasePath}
              className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              {isEn ? `All of ${displayRegionName} →` : `Toute la région ${regionConfig.name} →`}
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
