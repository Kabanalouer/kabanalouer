import Link from "next/link";
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
import { SITE_URL } from "@/lib/siteUrl";

export default async function RegionLanding({ regionConfig }: { regionConfig: RegionConfig }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const content = getRegionContent(regionConfig.slug);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      "id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities"
    )
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .order("created_at", { ascending: false })
    .limit(24);

  const listings: Listing[] = (rawListings ?? []).map((l) => ({
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
        .select("id, title, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities")
        .in("id", vedetteIds)
        .eq("is_published", true)
    : { data: [] as typeof rawListings };
  const vedetteListings: Listing[] = (rawVedette ?? []).map((l) => ({
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
    isFeatured: true,
  }));

  const otherRegions = REGIONS.filter((r) => r.slug !== regionConfig.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Chalets",
        item: `${SITE_URL}/chalets`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: regionConfig.name,
        item: `${SITE_URL}/chalets/${regionConfig.slug}`,
      },
    ],
  };

  const itemListJsonLd =
    listings.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Chalets à louer ${regionConfig.locative}`,
          numberOfItems: listings.length,
          itemListElement: listings.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/chalets/${l.id}`,
            name: l.title,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[460px] z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${regionConfig.heroImage}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/75" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <nav className="text-xs text-white/60 mb-4 flex items-center gap-1.5">
            <Link href={localePath("/", locale)} className="hover:text-white transition-colors">
              {isEn ? "Home" : "Accueil"}
            </Link>
            <span>›</span>
            <Link href={localePath("/chalets", locale)} className="hover:text-white transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <span className="text-white/90">{regionConfig.name}</span>
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
              : "Contact direct avec les propriétaires québécois."}
          </p>
          <SearchBar initialRegion={regionConfig.dbValue} />
        </div>
      </section>

      {/* ── Chalets en vedette dans cette région ── */}
      {vedetteListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 w-full">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Chalets en vedette dans cette région</h2>
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
            <h2 className="text-xl font-bold text-gray-900">
              {listingCount > 0
                ? `${listingCount} chalet${listingCount > 1 ? "s" : ""} disponible${listingCount > 1 ? "s" : ""} ${regionConfig.locative}`
                : `Chalets ${regionConfig.locative}`}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Contact direct avec les propriétaires · Aucun frais de service
            </p>
          </div>
          <Link
            href={localePath("/chalets", locale)}
            className="text-primary font-semibold text-sm hover:underline hidden md:block"
          >
            {isEn ? "All regions →" : "Voir toutes les régions →"}
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
          <div className="text-center py-20 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 text-lg mb-2">
              Aucun chalet disponible {regionConfig.locative} pour l&apos;instant.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Soyez les premiers à découvrir les chalets de cette région.
            </p>
            <Link
              href={localePath("/chalets", locale)}
              className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              {isEn ? "Explore all regions →" : "Explorer toutes les régions →"}
            </Link>
          </div>
        )}
      </section>

      {/* ── Highlights ── */}
      {content && (
        <section className="bg-charcoal-50 py-14">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-charcoal-800 mb-8">
              {isEn
                ? `Why choose ${content.region_en}?`
                : `Pourquoi louer un chalet ${regionConfig.locative} ?`}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
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
                  <span className="text-charcoal-700 text-sm leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Description ── */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-charcoal-800 mb-6">
            {isEn
              ? `Discover ${content?.region_en ?? regionConfig.name}`
              : `Découvrez ${content?.region_fr ?? regionConfig.name}`}
          </h2>
          <div className="space-y-4">
            {(isEn && content?.description_en
              ? content.description_en
              : regionConfig.seoText
            ).map((paragraph, i) => (
              <p key={i} className="text-charcoal-500 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      {faqItems.length > 0 && (
        <section className="bg-charcoal-50 py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-charcoal-800 mb-8">
              {isEn ? "Frequently asked questions" : "Questions fréquentes"}
            </h2>
            <div className="space-y-6">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-charcoal-800 mb-2">{item.question}</h3>
                  <p className="text-charcoal-500 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Other regions ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Explorer d&apos;autres régions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {otherRegions.map((r) => (
            <Link
              key={r.slug}
              href={localePath(`/chalets/${r.slug}`, locale)}
              className="flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-gray-700 hover:text-primary"
            >
              {r.name}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
