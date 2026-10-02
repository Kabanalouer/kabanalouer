import Link from "next/link";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import LandingSearchCta from "./LandingSearchCta";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OwnersSection from "@/components/OwnersSection";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import AmenityIcon from "@/components/AmenityIcon";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { safeJsonLd } from "@/lib/jsonLd";
import { formatPrice } from "@/lib/formatPrice";
import {
  getAmenityCatalogEntry, getAmenityLabel, getAmenityLabels, summarizeAmenityDetails,
  type AmenityValue,
} from "@/lib/amenities-catalog";
import { REGIONS, getRegionByDbValue } from "@/lib/regions";
import type { AmenityLanding as AmenityLandingConfig } from "@/lib/amenityLandings";

// Page SEO/GEO thématique par équipement (spa, bord de l'eau, billard, borne
// de recharge, télétravail — voir lib/amenityLandings.ts). Même patron que
// DogFriendlyLanding.tsx : les réponses de la FAQ sont calculées à partir des
// vraies fiches (nombre, régions, prix de départ, accès privé) — jamais un
// chiffre inventé.

type AmenityListing = Listing & { featureLine: string | null; privateAccess: boolean | null };

function plural(n: number, one: string, other: string) {
  return n > 1 ? other : one;
}

export function buildAmenityLandingMeta(config: AmenityLandingConfig, isEn: boolean) {
  return {
    title: isEn ? config.metaTitleEn : config.metaTitleFr,
    description: isEn ? config.metaDescriptionEn : config.metaDescriptionFr,
  };
}

// Valeur du champ « acces » d'un équipement : true = privé, false = partagé,
// null = non précisé. « Privé et Commun » (espace de travail) compte comme privé.
function parseAccess(details: Record<string, unknown> | undefined): boolean | null {
  const v = details?.acces;
  if (typeof v !== "string") return null;
  if (v.startsWith("Privé")) return true;
  if (v === "Partagé" || v === "Commun") return false;
  return null;
}

export default async function AmenityLanding({ config }: { config: AmenityLandingConfig }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Filtre côté JS (voir countAmenityLandingsWith dans lib/amenityLandings.ts)
  const { data: rawListings } = await supabase
    .from("listings")
    .select("id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const listings: AmenityListing[] = [];
  for (const l of rawListings ?? []) {
    const amenities = Array.isArray(l.amenities) ? (l.amenities as AmenityValue[]) : [];
    const matched = amenities.find((a) => config.amenityIds.includes(a?.id));
    if (!matched) continue;
    const catalogEntry = getAmenityCatalogEntry(matched.id);
    const summary = catalogEntry ? summarizeAmenityDetails(catalogEntry, matched.details, locale) : null;
    const label = getAmenityLabel(matched.id, locale);
    listings.push({
      id: l.id as string,
      title: (((isEn && l.title_en) ? l.title_en : l.title) as string | null) ?? "",
      region: (l.region as string | null) ?? "",
      city: (l.city as string | null) ?? null,
      listing_number: (l.listing_number as number | null) ?? null,
      custom_slug: (l.custom_slug as string | null) ?? null,
      price: (l.price_low as number) ?? 0,
      priceOnRequest: (l.price_on_request as boolean) ?? false,
      capacity: (l.capacity as number) ?? 1,
      bedrooms: (l.bedrooms as number) ?? 1,
      photos: normalizePhotos(l.photos).map((p) => p.url),
      tags: getAmenityLabels(amenities, locale).slice(0, 3),
      featureLine: summary ? `${label} · ${summary}` : label,
      privateAccess: parseAccess(matched.details),
    });
  }

  const count = listings.length;
  const [nounOne, nounOther] = isEn ? config.nounEn : config.nounFr;
  const linkLabel = isEn ? config.linkEn : config.linkFr;
  const noun = (n: number) => plural(n, nounOne, nounOther);

  const regionCounts = REGIONS
    .map((r) => ({ region: r, count: listings.filter((l) => l.region === r.dbValue).length }))
    .filter((r) => r.count > 0);

  const pricedListings = listings.filter((l) => !l.priceOnRequest && l.price > 0);
  const minPrice = pricedListings.reduce<number | null>((m, l) => (m === null || l.price < m ? l.price : m), null);
  const privateCount = listings.filter((l) => l.privateAccess === true).length;
  const sharedCount = listings.filter((l) => l.privateAccess === false).length;

  const pagePath = isEn ? config.pathEn : config.pathFr;
  const filterId = config.amenityIds[0];
  const filterLabel = getAmenityLabel(filterId, locale);
  const regionName = (dbValue: string) => (isEn ? getRegionByDbValue(dbValue)?.nameEn ?? dbValue : dbValue);
  const searchPath = (regionDbValue?: string) => {
    const params = new URLSearchParams();
    if (regionDbValue) params.set("region", regionDbValue);
    params.set("amenities", filterId);
    return localePath(`/chalets?${params.toString()}`, locale);
  };
  const regionList = regionCounts
    .map(({ region, count: n }) => `${isEn ? region.nameEn : region.name} (${n})`)
    .join(", ");

  const faq: { question: string; answer: string }[] = [];
  if (isEn) {
    faq.push({
      question: `How do I find a ${nounOne} in Quebec?`,
      answer: `${config.allHaveEn}${count > 0 ? ` (${count} ${noun(count)} right now)` : ""}. You can also turn on the "${filterLabel}" filter in the search.`,
    });
    faq.push({
      question: `In which regions can I find a ${nounOne}?`,
      answer: count > 0
        ? `Right now, Kabanalouer lists ${nounOther} in ${plural(regionCounts.length, "this region", "these regions")}: ${regionList}.`
        : "New cabins are added regularly everywhere in Quebec.",
    });
    if (minPrice !== null) {
      faq.push({
        question: `How much does a ${nounOne} cost?`,
        answer: `${count > 1 ? `Right now, prices start at ${formatPrice(minPrice, locale)}/night among the ${count} ${nounOther} listed.` : `Right now, the ${nounOne} listed starts at ${formatPrice(minPrice, locale)}/night.`} The owner confirms the final price for your dates directly.`,
      });
    }
    if (config.accessQuestionEn && privateCount + sharedCount > 0) {
      faq.push({
        question: config.accessQuestionEn,
        answer: `It depends on the cabin. ${count > 1 ? `Right now, out of the ${count} ${nounOther} on this page, ${[privateCount > 0 ? `${privateCount} ${plural(privateCount, "has", "have")} private access` : null, sharedCount > 0 ? `${sharedCount} ${plural(sharedCount, "has", "have")} shared access` : null].filter(Boolean).join(" and ")}.` : `Right now, the ${nounOne} on this page has ${privateCount > 0 ? "private" : "shared"} access.`} Access is shown on each listing when the owner has specified it.`,
      });
    }
  } else {
    faq.push({
      question: `Comment trouver un ${nounOne} au Québec ?`,
      answer: `${config.allHaveFr}${count > 0 ? ` (${count} ${noun(count)} en ce moment)` : ""}. Vous pouvez aussi activer le filtre « ${filterLabel} » dans la recherche.`,
    });
    faq.push({
      question: `Dans quelles régions trouver un ${nounOne} ?`,
      answer: count > 0
        ? `En ce moment, Kabanalouer propose des ${nounOther} dans ${plural(regionCounts.length, "cette région", "ces régions")} : ${regionList}.`
        : "De nouveaux chalets s'ajoutent régulièrement partout au Québec.",
    });
    if (minPrice !== null) {
      faq.push({
        question: `Combien coûte un ${nounOne} ?`,
        answer: `${count > 1 ? `En ce moment, les prix commencent à ${formatPrice(minPrice, locale)}/nuit parmi les ${count} ${nounOther} affichés.` : `En ce moment, le ${nounOne} affiché est offert à partir de ${formatPrice(minPrice, locale)}/nuit.`} Le propriétaire confirme directement le prix final pour vos dates.`,
      });
    }
    if (config.accessQuestionFr && privateCount + sharedCount > 0) {
      faq.push({
        question: config.accessQuestionFr,
        answer: `Ça dépend du chalet. ${count > 1 ? `En ce moment, sur les ${count} ${nounOther} de cette page, ${[privateCount > 0 ? `${privateCount} ${plural(privateCount, "a", "ont")} un accès privé` : null, sharedCount > 0 ? `${sharedCount} ${plural(sharedCount, "a", "ont")} un accès partagé` : null].filter(Boolean).join(" et ")}.` : `En ce moment, le ${nounOne} de cette page a un accès ${privateCount > 0 ? "privé" : "partagé"}.`} L'accès est indiqué sur chaque fiche quand le propriétaire l'a précisé.`,
      });
    }
  }
  faq.push(isEn
    ? { question: "Does Kabanalouer charge service fees?", answer: "No. You contact the owner directly, with no service fees or commission." }
    : { question: "Est-ce que Kabanalouer charge des frais de service ?", answer: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission." });

  const tips = isEn ? config.tipsEn : config.tipsFr;

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Accueil", item: `${SITE_URL}${isEn ? "/en" : "/"}` },
      { "@type": "ListItem", position: 2, name: isEn ? "Cabins" : "Chalets", item: `${SITE_URL}${localePath("/chalets", locale)}` },
      { "@type": "ListItem", position: 3, name: linkLabel, item: `${SITE_URL}${pagePath}` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isEn ? config.h1En : config.h1Fr,
    numberOfItems: count,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LodgingBusiness",
        name: l.title,
        url: `${SITE_URL}${buildListingPath(
          { region: l.region, city: l.city ?? null, listing_number: l.listing_number ?? null, custom_slug: l.custom_slug ?? null },
          isEn ? "en" : "fr"
        ) ?? `/chalets/${l.id}`}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: l.city ?? regionName(l.region),
          addressRegion: regionName(l.region),
          addressCountry: "CA",
        },
        ...(l.featureLine
          ? { amenityFeature: { "@type": "LocationFeatureSpecification", name: l.featureLine, value: true } }
          : {}),
      },
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      <Navbar />
      <main className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="bg-charcoal-50 border-b border-charcoal-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-sm text-charcoal-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap" aria-label={isEn ? "Breadcrumb" : "Fil d’Ariane"}>
            <Link href={localePath("/chalets", locale)} className="inline-block py-2 -my-2 hover:text-primary hover:underline transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <span className="text-charcoal-600">{linkLabel}</span>
          </nav>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <AmenityIcon name={config.icon} className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            {isEn ? config.h1En : config.h1Fr}
          </h1>
          <p className="text-base text-charcoal-500 mb-8">
            {isEn ? config.introEn : config.introFr}
          </p>
          <div className="flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-heading-2 font-bold text-charcoal-900">
              {`${count} ${noun(count)}`}
            </h2>
            <p className="text-charcoal-500 mt-1 text-sm">
              {isEn ? "Direct contact · No service fees" : "Contact direct · Aucuns frais de service"}
            </p>
          </div>
          {count > 0 && (
            <Link href={searchPath()} className={`text-sm hidden md:block shrink-0 ${TEXT_LINK_CLASSNAME}`}>
              {isEn ? `See all ${nounOther} →` : `Voir tous les ${nounOther} →`}
            </Link>
          )}
        </div>

        {count === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-charcoal-800 mb-1">
              {isEn ? `No ${nounOther} yet` : `Aucun ${nounOne} pour le moment`}
            </p>
            <p className="text-base text-charcoal-400 mb-6">
              {isEn ? "New cabins are added regularly." : "De nouveaux chalets s'ajoutent régulièrement."}
            </p>
            <Link
              href={localePath("/chalets", locale)}
              className="inline-flex bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {isEn ? "See all cabins" : "Voir tous les chalets"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} currentUserId={user?.id ?? null} />
                {listing.featureLine && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-600">
                    <AmenityIcon name={config.icon} className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{listing.featureLine}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── By region ── */}
      {regionCounts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
            {isEn ? `${linkLabel} by region` : `${linkLabel} par région`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {regionCounts.map(({ region, count: n }) => (
              <Link
                key={region.slug}
                href={searchPath(region.dbValue)}
                className="px-4 py-2 rounded-full border border-charcoal-100 text-sm text-charcoal-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {isEn ? region.nameEn : region.name} ({n})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Tips ── */}
      <section className="bg-charcoal-50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
            {isEn ? config.tipsTitleEn : config.tipsTitleFr}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {tips.map((tip) => (
              <div key={tip.title} className="bg-white rounded-2xl border border-[#ebebeb] p-5">
                <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{tip.title}</h3>
                <p className="text-base text-charcoal-500 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
            {isEn ? "Frequently asked questions" : "Questions fréquentes"}
          </h2>
          <div className="space-y-6">
            {faq.map((item) => (
              <div key={item.question}>
                <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{item.question}</h3>
                <p className="text-charcoal-500 text-base leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
          {count > 0 && <LandingSearchCta href={searchPath()} isEn={isEn} />}
        </div>
        </div>
      </section>

      </main>

      {/* Bandeau vert de l'accueil, comme sur les pages région et ville */}
      <OwnersSection />
      <Footer />
    </div>
  );
}
