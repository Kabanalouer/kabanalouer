import ListYourCabinPromo from "@/components/ListYourCabinPromo";
import OwnersSection from "@/components/OwnersSection";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { REGIONS, type RegionConfig } from "@/lib/regions";
import { getRegionContent } from "@/lib/regionsContent";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import { safeJsonLd } from "@/lib/jsonLd";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { isKnownMunicipality } from "@/lib/municipalities";
import { slugify } from "@/lib/slugify";

export default async function RegionLanding({ regionConfig }: { regionConfig: RegionConfig }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const displayRegionName = isEn ? regionConfig.nameEn : regionConfig.name;
  const content = getRegionContent(regionConfig.slug);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug"
    )
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .order("created_at", { ascending: false })
    .limit(24);

  const listings: Listing[] = (rawListings ?? []).map((l) => ({
    id: l.id,
    title: (isEn && (l.title_en as string | null)) || (l.title ?? ""),
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

  // Vedette listings for this region and current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: vedetteRows } = await supabase
    .from("featured_listings")
    .select("listing_id")
    .eq("type", "region")
    .eq("region", regionConfig.dbValue)
    .eq("month", currentMonth)
    .eq("status", "active")
    .limit(3);
  const vedetteIds = (vedetteRows ?? []).map((r) => r.listing_id as string);
  const { data: rawVedette } = vedetteIds.length > 0
    ? await supabase
        .from("listings")
        .select("id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug")
        .in("id", vedetteIds)
        .eq("is_published", true)
    : { data: [] as typeof rawListings };
  const vedetteListings: Listing[] = (rawVedette ?? []).map((l) => ({
    id: l.id,
    title: (isEn && (l.title_en as string | null)) || (l.title ?? ""),
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
    isFeatured: true,
  }));

  // Villes de la région qui ont une page dédiée (au moins un chalet publié) :
  // maillage interne région → villes pour le SEO/GEO.
  const { data: cityRows } = await supabase
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .not("city", "is", null);
  const cityCounts = new Map<string, number>();
  for (const row of cityRows ?? []) {
    const c = row.city as string | null;
    if (c && isKnownMunicipality(c)) cityCounts.set(c, (cityCounts.get(c) ?? 0) + 1);
  }
  const regionCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const regionBasePath = isEn ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`;

  // Autres régions : seulement celles qui ont au moins un chalet publié
  // (jamais de lien vers une page vide).
  const { data: activeRegionRows } = await supabase.from("listings").select("region").eq("is_published", true);
  const activeRegions = new Set((activeRegionRows ?? []).map((r) => r.region as string | null).filter(Boolean));
  const otherRegions = REGIONS.filter((r) => r.slug !== regionConfig.slug && activeRegions.has(r.dbValue));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isEn ? "Home" : "Accueil",
        item: isEn ? `${SITE_URL}/en` : `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isEn ? "Cabins" : "Chalets",
        item: `${SITE_URL}${localePath("/chalets", locale)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayRegionName,
        item: `${SITE_URL}${isEn ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`}`,
      },
    ],
  };

  const itemListJsonLd =
    listings.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: isEn ? `Cabins for rent ${content?.locative_en ?? "in Quebec"}` : `Chalets à louer ${regionConfig.locative}`,
          numberOfItems: listings.length,
          itemListElement: (rawListings ?? []).map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${buildListingPath(
              { region: l.region as string | null, city: l.city as string | null, listing_number: l.listing_number as number | null, custom_slug: l.custom_slug as string | null },
              isEn ? "en" : "fr"
            ) ?? `/chalets/${l.id}`}`,
            name: (isEn && (l.title_en as string | null)) || l.title,
          })),
        }
      : null;

  const listingCount = listings.length;

  const faqItems = isEn ? (content?.faq_en ?? []) : (content?.faq_fr ?? []);
  const faqJsonLd = faqItems.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="relative h-[460px] z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* next/image en priorité plutôt qu'un fond CSS : compressée (WebP/AVIF),
              à la bonne taille et découverte dès le HTML — c'est l'élément LCP. */}
          <Image
            src={regionConfig.heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/75" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <nav className="text-sm text-white/80 mb-4 flex items-center gap-1.5" aria-label={isEn ? "Breadcrumb" : "Fil d’Ariane"}>
            <Link href={localePath("/", locale)} className="inline-block py-2 -my-2 hover:text-white transition-colors">
              {isEn ? "Home" : "Accueil"}
            </Link>
            <span>›</span>
            <Link href={localePath("/chalets", locale)} className="inline-block py-2 -my-2 hover:text-white transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <span className="text-white/90">{displayRegionName}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 max-w-3xl leading-tight">
            {isEn
              ? `Cabin Rentals ${content?.locative_en ?? "in Quebec"}`
              : `Chalets à louer ${regionConfig.locative}`}
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-lg">
            {isEn
              ? `Find your perfect cabin ${content?.locative_en ?? "in Quebec"}.`
              : `Trouvez votre chalet idéal ${regionConfig.locative}.`}
            <br />
            {isEn
              ? "Direct contact with local owners. No service fees."
              : "Contact direct avec les propriétaires."}
          </p>
          <SearchBar initialRegion={regionConfig.dbValue} />
        </div>
      </section>

      {/* ── Chalets en vedette dans cette région ── */}
      {vedetteListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-6">
            {isEn ? "Featured cabins in this region" : "Chalets en vedette dans cette région"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            {vedetteListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
            ))}
          </div>
        </section>
      )}

      {/* ── Results ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-heading-2 font-bold text-charcoal-900">
              {isEn
                ? (listingCount > 0
                    ? `${listingCount} cabin${listingCount > 1 ? "s" : ""} available ${content?.locative_en ?? "in Quebec"}`
                    : `Cabins ${content?.locative_en ?? "in Quebec"}`)
                : (listingCount > 0
                    ? `${listingCount} chalet${listingCount > 1 ? "s" : ""} disponible${listingCount > 1 ? "s" : ""} ${regionConfig.locative}`
                    : `Chalets ${regionConfig.locative}`)}
            </h2>
            <p className="text-charcoal-500 mt-1 text-sm">
              {isEn
                ? "Direct contact with owners · No service fees"
                : "Contact direct avec les propriétaires · Aucun frais de service"}
            </p>
          </div>
          {/* Vers la recherche filtrée sur la région (filtres, dates, carte ; la page région s'arrête à 24 chalets) */}
          <Link
            href={`${localePath("/chalets", locale)}?region=${encodeURIComponent(regionConfig.dbValue)}`}
            className={`text-sm hidden md:block ${TEXT_LINK_CLASSNAME}`}
          >
            {isEn
              ? `See all cabins ${content?.locative_en ?? `in ${displayRegionName}`} →`
              : `Voir tous les chalets ${regionConfig.genitive} →`}
          </Link>
        </div>

        {listingCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUserId={user?.id ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-charcoal-50 rounded-2xl">
            <p className="text-charcoal-500 text-lg mb-2">
              {isEn ? (
                `No cabins available ${content?.locative_en ?? "in Quebec"} yet.`
              ) : (
                <>Aucun chalet disponible {regionConfig.locative}{" "}pour l&apos;instant.</>
              )}
            </p>
            <p className="text-charcoal-400 text-base mb-6">
              {isEn
                ? "Be the first to discover the cabins in this region."
                : "Soyez les premiers à découvrir les chalets de cette région."}
            </p>
            <Link
              href={localePath("/chalets", locale)}
              className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              {isEn ? "Explore all regions →" : "Explorer toutes les régions →"}
            </Link>
            <div className="mt-10 px-4">
              <ListYourCabinPromo />
            </div>
          </div>
        )}
      </section>

      {/* ── Highlights ── */}
      {content && (
        <section className="bg-charcoal-50 py-14">
          {/* Même conteneur que les autres sections (marge gauche alignée) ; la largeur de lecture est limitée à l'intérieur */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
              {isEn
                ? `Why choose ${content.region_en}?`
                : `Pourquoi louer un chalet ${regionConfig.locative} ?`}
            </h2>
            <ul className="max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              {(isEn ? content.highlights_en : content.highlights_fr).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-primary shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-charcoal-700 text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Description ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-6">
            {isEn
              ? `Discover ${content?.region_en ?? displayRegionName}`
              : `Découvrez ${content?.region_fr ?? displayRegionName}`}
          </h2>
          <div className="max-w-3xl space-y-4">
            {(isEn
              ? content?.description_en ?? [
                  `${displayRegionName} is one of Quebec's regions to explore by cabin, with lakes, forests and small towns to discover in every season.`,
                  `Renting a cabin in ${displayRegionName} means dealing directly with local owners, with no service fees. Browse the listings above and contact the owner to check availability and rates.`,
                ]
              : regionConfig.seoText
            ).map((paragraph, i) => (
              <p key={i} className="text-charcoal-500 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Villes de la région ── */}
      {regionCities.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
            {isEn ? `Cities in ${displayRegionName}` : `Villes ${regionConfig.locative}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {regionCities.map(([city, n]) => (
              <Link
                key={city}
                href={`${regionBasePath}/${slugify(city)}`}
                className="px-4 py-2 rounded-full border border-charcoal-100 text-sm text-charcoal-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {isEn ? `Cabin rentals in ${city}` : `Location de chalet à ${city}`}
                <span className="text-charcoal-400"> · {n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faqItems.length > 0 && (
        <section className="bg-charcoal-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
              {isEn ? "Frequently asked questions" : "Questions fréquentes"}
            </h2>
            <div className="max-w-3xl space-y-6">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{item.question}</h3>
                  <p className="text-charcoal-500 text-base leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Other regions ── */}
      {otherRegions.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h2 className="text-heading-2 font-bold text-charcoal-900 mb-6">{isEn ? "Explore other regions" : "Explorer d'autres régions"}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {otherRegions.map((r) => (
            <Link
              key={r.slug}
              href={isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`}
              className="flex items-center px-4 py-3 rounded-xl border border-charcoal-100 hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-charcoal-700 hover:text-primary"
            >
              {isEn ? r.nameEn : r.name}
            </Link>
          ))}
        </div>
      </section>
      )}

      </main>

      {/* Bandeau vert de l'accueil, aussi sur les pages de résultats */}
      <OwnersSection />
      <Footer />
    </div>
  );
}
