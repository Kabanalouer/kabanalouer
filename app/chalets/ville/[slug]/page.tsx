import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { normalizePhotos } from "@/lib/photo";
import { REGIONS } from "@/lib/regions";
import { slugify } from "@/lib/slugify";
import { SITE_URL } from "@/lib/siteUrl";
import type { Metadata } from "next";

export const revalidate = 86400;

const BASE = SITE_URL;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Cached per request — shared between generateMetadata and the page component
const getPublishedCities = cache(async (): Promise<string[]> => {
  const { data } = await adminClient()
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .not("city", "is", null);
  return [...new Set((data ?? []).map((d) => d.city as string).filter(Boolean))];
});

function cityFromSlug(slug: string, cities: string[]): string | undefined {
  return cities.find((c) => slugify(c) === slug);
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const cities = await getPublishedCities();
  return cities.map((city) => ({ slug: slugify(city) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cities = await getPublishedCities();
  const cityName = cityFromSlug(slug, cities);
  if (!cityName) return {};

  const title = `Chalets à louer à ${cityName}`;
  const description = `Découvrez nos chalets à louer à ${cityName}, Québec. Contact direct avec les propriétaires, aucun frais de service.`;
  return {
    title,
    description,
    alternates: { canonical: `/chalets/ville/${slug}` },
    openGraph: { title, description, url: `/chalets/ville/${slug}` },
    twitter: { title, description },
  };
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;

  const cities = await getPublishedCities();
  const cityName = cityFromSlug(slug, cities);
  if (!cityName) notFound();

  // Listings for this city (SSR Supabase for user session)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      "id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities"
    )
    .eq("is_published", true)
    .eq("city", cityName)
    .order("created_at", { ascending: false });

  if (!rawListings || rawListings.length === 0) notFound();

  const listings: Listing[] = rawListings.map((l) => ({
    id: l.id,
    title: l.title ?? "",
    region: l.region ?? "",
    city: (l.city as string | null) ?? null,
    price: (l.price_low as number) ?? 0,
    priceOnRequest: (l.price_on_request as boolean) ?? false,
    capacity: (l.capacity as number) ?? 1,
    bedrooms: (l.bedrooms as number) ?? 1,
    photos: normalizePhotos(l.photos).map((p) => p.url),
    tags: Array.isArray(l.amenities) ? (l.amenities as string[]).slice(0, 3) : [],
  }));

  const regionDbValue = listings[0].region;
  const regionConfig = REGIONS.find((r) => r.dbValue === regionDbValue);

  // Other cities in the same region
  const { data: regionCityData } = await adminClient()
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .eq("region", regionDbValue)
    .not("city", "is", null);

  const otherCities = [
    ...new Set(
      (regionCityData ?? [])
        .map((d) => d.city as string)
        .filter((c) => c && c !== cityName)
    ),
  ].slice(0, 10);

  const count = listings.length;

  // JSON-LD
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Accueil", item: `${BASE}/` },
    { "@type": "ListItem", position: 2, name: "Chalets", item: `${BASE}/chalets` },
    ...(regionConfig
      ? [
          {
            "@type": "ListItem",
            position: 3,
            name: regionConfig.name,
            item: `${BASE}/chalets/${regionConfig.slug}`,
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: regionConfig ? 4 : 3,
      name: cityName,
      item: `${BASE}/chalets/ville/${slug}`,
    },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs,
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Chalets à louer à ${cityName}`,
    numberOfItems: count,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE}/chalets/${l.id}`,
      name: l.title,
    })),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap">
            <Link href="/chalets" className="hover:text-primary transition-colors">
              Chalets
            </Link>
            {regionConfig && (
              <>
                <span>›</span>
                <Link
                  href={`/chalets/${regionConfig.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {regionConfig.name}
                </Link>
              </>
            )}
            <span>›</span>
            <span className="text-gray-600">{cityName}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Chalets à louer à {cityName}
          </h1>
          <p className="text-gray-500 mb-8">
            {count} chalet{count > 1 ? "s" : ""} disponible{count > 1 ? "s" : ""} à{" "}
            {cityName}
            {regionConfig ? `, ${regionConfig.name}` : ""}
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
            <h2 className="text-xl font-bold text-gray-900">
              {count} chalet{count > 1 ? "s" : ""} à {cityName}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Contact direct · Aucun frais de service
            </p>
          </div>
          {regionConfig && (
            <Link
              href={`/chalets/${regionConfig.slug}`}
              className="text-primary font-semibold text-sm hover:underline hidden md:block"
            >
              Voir tous les chalets {regionConfig.locative} →
            </Link>
          )}
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
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Autres villes{regionConfig ? ` ${regionConfig.locative}` : ""}
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCities.map((city) => (
              <Link
                key={city}
                href={`/chalets/ville/${slugify(city)}`}
                className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {city}
              </Link>
            ))}
            {regionConfig && (
              <Link
                href={`/chalets/${regionConfig.slug}`}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                Toute la région {regionConfig.name} →
              </Link>
            )}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
