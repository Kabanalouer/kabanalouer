import OwnersSection from "@/components/OwnersSection";
import Link from "next/link";
import ComboLinkChips from "./ComboLinkChips";
import { activeThemesInCity, activeThemesInRegion, comboPath, comboPlace, getComboIndex } from "@/lib/comboLandings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { isKnownMunicipality, getMunicipalityByName } from "@/lib/municipalities";
import { formatPrice } from "@/lib/formatPrice";
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
// Espaces insécables du français (règle OQLF, voir CLAUDE.md).
const NB = "\u00a0";
const NNB = "\u202f";

export default async function CityLanding({
  regionConfig,
  cityName,
}: {
  regionConfig: RegionConfig;
  cityName: string;
}) {
  const [supabase, locale, comboIndex] = await Promise.all([createClient(), getLocale(), getComboIndex()]);
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
      "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug, dogs_allowed"
    )
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .eq("city", cityName)
    .order("created_at", { ascending: false });

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

  // Texte et FAQ calculés sur les vraies annonces de la ville (jamais de
  // chiffre inventé) : contenu unique par ville pour le SEO et les IA.
  const raw = rawListings ?? [];
  const hasAmenity = (l: (typeof raw)[number], id: string) =>
    Array.isArray(l.amenities) && (l.amenities as AmenityValue[]).some((a) => a.id === id);
  const maxCapacity = Math.max(0, ...raw.map((l) => (l.capacity as number) ?? 0));
  const prices = raw.filter((l) => !l.price_on_request && ((l.price_low as number) ?? 0) > 0).map((l) => l.price_low as number);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const spaCount = raw.filter((l) => hasAmenity(l, "spa")).length;
  const waterCount = raw.filter((l) => hasAmenity(l, "bord-eau") || hasAmenity(l, "acces-lac")).length;
  const dogCount = raw.filter((l) => l.dogs_allowed).length;
  const mrc = getMunicipalityByName(cityName)?.mrc;
  const money = (n: number) => formatPrice(Math.round(n).toLocaleString(isEn ? "en-CA" : "fr-CA"), locale);
  const chalets = (n: number) => (isEn ? `${n} cabin${n > 1 ? "s" : ""}` : `${n} chalet${n > 1 ? "s" : ""}`);

  const aboutFr = [
    `${cityName} est une municipalité ${regionConfig.locative}${mrc ? `, dans la ${mrc}` : ""}. Kabanalouer y compte ${chalets(count)} à louer, pouvant accueillir jusqu'à ${maxCapacity} personnes.`,
    [
      spaCount > 0 ? `${chalets(spaCount)} avec spa` : null,
      waterCount > 0 ? `${chalets(waterCount)} au bord de l'eau ou avec accès à un lac` : null,
      dogCount > 0 ? `${chalets(dogCount)} où les chiens sont acceptés` : null,
    ].filter(Boolean).length > 0
      ? `On y trouve notamment ${[
          spaCount > 0 ? `${chalets(spaCount)} avec spa` : null,
          waterCount > 0 ? `${chalets(waterCount)} au bord de l'eau ou avec accès à un lac` : null,
          dogCount > 0 ? `${chalets(dogCount)} où les chiens sont acceptés` : null,
        ].filter(Boolean).join(", ")}.`
      : null,
    `Vous contactez directement le propriétaire, sans frais de service.`,
  ].filter(Boolean) as string[];
  const aboutEn = [
    `${cityName} is a municipality in ${displayRegionName}${mrc ? ` (${mrc})` : ""}. Kabanalouer has ${chalets(count)} for rent there, sleeping up to ${maxCapacity} guests.`,
    [spaCount, waterCount, dogCount].some((n) => n > 0)
      ? `Among them: ${[
          spaCount > 0 ? `${chalets(spaCount)} with a hot tub` : null,
          waterCount > 0 ? `${chalets(waterCount)} on the water or with lake access` : null,
          dogCount > 0 ? `${chalets(dogCount)} that welcome dogs` : null,
        ].filter(Boolean).join(", ")}.`
      : null,
    `You contact the owner directly, with no service fees.`,
  ].filter(Boolean) as string[];

  const faq = isEn
    ? [
        { q: `How many cabins are for rent in ${cityName}?`, a: `Kabanalouer currently has ${chalets(count)} for rent in ${cityName}, sleeping up to ${maxCapacity} guests.` },
        { q: `How much does a cabin rental in ${cityName} cost?`, a: minPrice !== null ? `Listed prices start at ${money(minPrice)} per night. Some owners quote on request: you get a price for your dates, with no service fees.` : `Owners in ${cityName} quote on request: send your dates and you get a price, with no service fees.` },
        ...(spaCount > 0 ? [{ q: `Are there cabins with a hot tub in ${cityName}?`, a: `Yes, ${chalets(spaCount)} in ${cityName} ${spaCount > 1 ? "have" : "has"} a hot tub.` }] : []),
        { q: `Can I rent a cabin with my dog in ${cityName}?`, a: dogCount > 0 ? `Yes, ${chalets(dogCount)} in ${cityName} ${dogCount > 1 ? "welcome" : "welcomes"} dogs. Each listing shows the maximum number of dogs, size limits and any fees.` : `Not at the moment: no cabin in ${cityName} currently accepts dogs on Kabanalouer.` },
      ]
    : [
        { q: `Combien de chalets sont à louer à ${cityName}${NNB}?`, a: `Kabanalouer compte actuellement ${chalets(count)} à louer à ${cityName}, pouvant accueillir jusqu'à ${maxCapacity} personnes.` },
        { q: `Combien coûte la location d'un chalet à ${cityName}${NNB}?`, a: minPrice !== null ? `Les prix affichés commencent à ${money(minPrice)} par nuit. Certains propriétaires indiquent un prix sur demande${NB}: vous recevez alors un prix selon vos dates, sans frais de service.` : `Les propriétaires de ${cityName} indiquent un prix sur demande${NB}: envoyez vos dates et vous recevez un prix, sans frais de service.` },
        ...(spaCount > 0 ? [{ q: `Y a-t-il des chalets avec spa à ${cityName}${NNB}?`, a: `Oui, ${chalets(spaCount)} à ${cityName} ${spaCount > 1 ? "offrent" : "offre"} un spa.` }] : []),
        { q: `Peut-on louer un chalet avec son chien à ${cityName}${NNB}?`, a: dogCount > 0 ? `Oui, ${chalets(dogCount)} à ${cityName} ${dogCount > 1 ? "acceptent" : "accepte"} les chiens. Chaque fiche précise le nombre maximum de chiens, les restrictions de taille et les frais.` : `Pas pour le moment${NB}: aucun chalet de ${cityName} n'accepte les chiens sur Kabanalouer.` },
      ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  // JSON-LD
  const crumbs = [
    { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Accueil", item: isEn ? `${SITE_URL}/en` : `${SITE_URL}/` },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="bg-[#F8FAF9] border-b border-charcoal-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-sm text-charcoal-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap" aria-label={isEn ? "Breadcrumb" : "Fil d’Ariane"}>
            <Link href={localePath("/chalets", locale)} className="inline-block py-2 -my-2 hover:text-primary hover:underline transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <Link href={regionBasePath} className="inline-block py-2 -my-2 hover:text-primary hover:underline transition-colors">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 w-full">
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

      {/* ── Par type dans la ville (pages ville × type actives, lib/comboLandings.ts) ── */}
      {(() => {
        const typeLinks = activeThemesInCity(comboIndex, regionConfig, cityName).map((l) => ({
          href: comboPath(l.theme, l.region, l.city, isEn),
          label: isEn ? l.theme.linkEn : l.theme.linkFr,
          count: l.count,
        }));
        return typeLinks.length > 0 ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
            <ComboLinkChips
              title={isEn ? `Cabins by type ${comboPlace(regionConfig, cityName, true)}` : `Chalets par type ${comboPlace(regionConfig, cityName, false)}`}
              links={typeLinks}
            />
          </section>
        ) : null;
      })()}

      {/* ── À propos + FAQ (contenu calculé sur les annonces) ── */}
      <section className="bg-charcoal-50 border-y border-[#ebebeb] py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
        <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
          {isEn ? `Cabin rentals in ${cityName}` : `Location de chalet à ${cityName}`}
        </h2>
        <div className="space-y-3 text-base text-charcoal-600 leading-relaxed">
          {(isEn ? aboutEn : aboutFr).map((para) => <p key={para}>{para}</p>)}
        </div>
        <h2 className="text-heading-2 font-bold text-charcoal-900 mt-10 mb-4">
          {isEn ? "Frequently asked questions" : "Questions fréquentes"}
        </h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="border border-[#ebebeb] bg-white rounded-2xl p-5">
              <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-1">{f.q}</h3>
              <p className="text-base text-charcoal-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
        </div>
        </div>
      </section>

      {/* ── Other cities in region ── */}
      {otherCities.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
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

      </main>

      {/* Bandeau vert de l'accueil, aussi sur les pages de résultats */}
      <OwnersSection />
      <Footer />
    </div>
  );
}
