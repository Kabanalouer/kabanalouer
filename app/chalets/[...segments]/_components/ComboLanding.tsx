import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import LandingSearchCta from "./LandingSearchCta";
import ComboLinkChips from "./ComboLinkChips";
import { parseAccess } from "./AmenityLanding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OwnersSection from "@/components/OwnersSection";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import AmenityIcon from "@/components/AmenityIcon";
import PawIcon from "@/components/PawIcon";
import AccessibilityIcon from "@/components/AccessibilityIcon";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getLocale } from "next-intl/server";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { safeJsonLd } from "@/lib/jsonLd";
import { formatPrice } from "@/lib/formatPrice";
import { slugify } from "@/lib/slugify";
import { getAmenityCatalogEntry, getAmenityLabel, getAmenityLabels, summarizeAmenityDetails, type AmenityValue } from "@/lib/amenities-catalog";
import { DOG_POLICY_COLUMNS, dogPolicyShortSummary, parseDogPolicy } from "@/lib/dogPolicy";
import type { RegionConfig } from "@/lib/regions";
import {
  MIN_LISTINGS_FOR_COMBO, activeCitiesForTheme, activeRegionsForTheme, activeThemesInCity, activeThemesInRegion,
  comboLinkLabel, comboPath, comboPlace, comboSearchPath, getComboIndex, type ComboLink, type ComboTheme,
} from "@/lib/comboLandings";

// Page région × type (/chalets/laurentides/avec-spa) ou ville × type
// (/chalets/laurentides/mille-isles/avec-spa) — voir lib/comboLandings.ts.
// Tous les chiffres viennent des vraies fiches publiées, jamais inventés.
// Le maillage interne (villes, autres types, autres régions, pages parentes)
// ne pointe que vers des pages qui ont elles-mêmes au moins
// MIN_LISTINGS_FOR_COMBO chalets.

type ComboListing = Listing & { featureLine: string | null; privateAccess: boolean | null; dogsMax: number | null; dogsFree: boolean };

function plural(n: number, one: string, other: string) {
  return n > 1 ? other : one;
}

function joinList(items: string[], isEn: boolean) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${isEn ? "and" : "et"} ${items[items.length - 1]}`;
}

export function buildComboTitle(theme: ComboTheme, region: RegionConfig, city: string | null, isEn: boolean) {
  return `${isEn ? theme.phraseEn : theme.phraseFr} ${comboPlace(region, city, isEn)}`;
}

export function buildComboDescription(theme: ComboTheme, region: RegionConfig, city: string | null, count: number, isEn: boolean) {
  const [one, other] = isEn ? theme.nounEn : theme.nounFr;
  const place = comboPlace(region, city, isEn);
  return isEn
    ? `${count} ${plural(count, one, other)} for rent ${place}${city ? `, ${region.nameEn}` : ""}. Compare listings and contact owners directly, with no service fees.`
    : `${count} ${plural(count, one, other)} à louer ${place}${city ? `, ${region.name}` : ""}. Comparez les fiches et contactez directement les propriétaires, aucuns frais de service.`;
}

function ThemeIcon({ theme, className }: { theme: ComboTheme; className: string }) {
  if (theme.key === "dogs") return <PawIcon className={className} />;
  if (theme.key === "accessible") return <AccessibilityIcon className={className} />;
  return <AmenityIcon name={theme.icon} className={className} />;
}

export default async function ComboLanding({ theme, regionConfig, cityName }: { theme: ComboTheme; regionConfig: RegionConfig; cityName: string | null }) {
  const [supabase, locale, index] = await Promise.all([createClient(), getLocale(), getComboIndex()]);
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("listings")
    .select(`id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug, reduced_mobility, ${DOG_POLICY_COLUMNS}`)
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .order("created_at", { ascending: false });
  if (cityName) query = query.eq("city", cityName);
  const { data: rawListings } = await query;

  const listings: ComboListing[] = [];
  for (const l of rawListings ?? []) {
    if (!theme.matches(l)) continue;
    const amenities = Array.isArray(l.amenities) ? (l.amenities as AmenityValue[]) : [];
    let featureLine: string | null = null;
    let privateAccess: boolean | null = null;
    if (theme.amenityIds) {
      const matched = amenities.find((a) => theme.amenityIds!.includes(a?.id));
      if (matched) {
        const entry = getAmenityCatalogEntry(matched.id);
        const summary = entry ? summarizeAmenityDetails(entry, matched.details, locale) : null;
        const label = getAmenityLabel(matched.id, locale);
        featureLine = summary ? `${label} · ${summary}` : label;
        privateAccess = parseAccess(matched.details);
      }
    }
    const dogPolicy = parseDogPolicy(l as Record<string, unknown>);
    if (theme.key === "dogs") featureLine = dogPolicyShortSummary(dogPolicy, locale);
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
      featureLine,
      privateAccess,
      dogsMax: dogPolicy.allowed ? dogPolicy.max : null,
      dogsFree: dogPolicy.allowed && dogPolicy.feeType === "free",
    });
  }

  // Données fraîches : sous le seuil, la page n'existe pas (même si un lien
  // mis en cache y pointait encore pendant quelques minutes).
  const count = listings.length;
  if (count < MIN_LISTINGS_FOR_COMBO) notFound();

  const place = comboPlace(regionConfig, cityName, isEn);
  const regionName = isEn ? regionConfig.nameEn : regionConfig.name;
  const [nounOne, nounOther] = isEn ? theme.nounEn : theme.nounFr;
  const noun = (n: number) => plural(n, nounOne, nounOther);
  const themeLabel = isEn ? theme.linkEn : theme.linkFr;
  const h1 = buildComboTitle(theme, regionConfig, cityName, isEn);

  const regionPath = isEn ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`;
  const cityPath = cityName ? `${regionPath}/${slugify(cityName)}` : null;
  const parentThemePath = isEn ? theme.parentPathEn : theme.parentPathFr;
  const selfPath = comboPath(theme, regionConfig, cityName, isEn);
  const searchPath = comboSearchPath(theme, regionConfig, cityName, isEn);

  // ── Faits calculés ──
  const cityCounts = new Map<string, number>();
  for (const l of listings) if (l.city) cityCounts.set(l.city, (cityCounts.get(l.city) ?? 0) + 1);
  const cities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const capacities = listings.map((l) => l.capacity).filter((c) => c > 0);
  const minCapacity = capacities.length ? Math.min(...capacities) : null;
  const maxCapacity = capacities.length ? Math.max(...capacities) : null;
  const maxBedrooms = listings.reduce((m, l) => Math.max(m, l.bedrooms), 0);
  const priced = listings.filter((l) => !l.priceOnRequest && l.price > 0);
  const minPrice = priced.length ? Math.min(...priced.map((l) => l.price)) : null;
  const privateCount = listings.filter((l) => l.privateAccess === true).length;
  const sharedCount = listings.filter((l) => l.privateAccess === false).length;
  const maxDogs = listings.reduce((m, l) => Math.max(m, l.dogsMax ?? 0), 0);
  const dogsFreeCount = listings.filter((l) => l.dogsFree).length;

  // « de 6 à 16 personnes » / « 8 personnes »
  const capacityText = minCapacity !== null && maxCapacity !== null
    ? (minCapacity === maxCapacity
        ? (isEn ? `${maxCapacity} guests` : `${maxCapacity} personnes`)
        : (isEn ? `${minCapacity} to ${maxCapacity} guests` : `de ${minCapacity} à ${maxCapacity} personnes`))
    : null;
  const topCities = cities.slice(0, 5).map(([c]) => c);

  const intro = isEn
    ? `${count} ${noun(count)} ${place}${!cityName && topCities.length ? `, in ${joinList(topCities, true)}` : ""}${capacityText ? `, for ${capacityText}` : ""}. Direct contact with owners, no service fees.`
    : `${count} ${noun(count)} ${place}${!cityName && topCities.length ? `, à ${joinList(topCities, false)}` : ""}${capacityText ? `, pour ${capacityText}` : ""}. Contact direct avec les propriétaires, aucuns frais de service.`;

  // ── FAQ ──
  const faq: { question: string; answer: string }[] = [];
  if (isEn) {
    faq.push({
      question: `How many ${nounOther} are there ${place}?`,
      answer: `Right now, Kabanalouer lists ${count} ${noun(count)} ${place}.`,
    });
    if (!cityName && cities.length > 0) {
      faq.push({
        question: `In which towns ${place} can I find a ${nounOne}?`,
        answer: `Right now: ${joinList(cities.map(([c, n]) => `${c} (${n})`), true)}.`,
      });
    }
    if (capacityText) {
      faq.push({
        question: "How many people can stay?",
        answer: `Cabins on this page sleep ${capacityText}, with up to ${maxBedrooms} ${plural(maxBedrooms, "bedroom", "bedrooms")}. Capacity is shown on each listing.`,
      });
    }
    if (minPrice !== null) {
      faq.push({
        question: `How much does a ${nounOne} ${place} cost?`,
        answer: `Right now, prices start at ${formatPrice(minPrice, locale)}/night. The owner confirms the final price for your dates directly.`,
      });
    }
    if (theme.accessQuestionEn && privateCount + sharedCount > 0) {
      faq.push({
        question: theme.accessQuestionEn,
        answer: `It depends on the cabin. Right now, ${[privateCount > 0 ? `${privateCount} ${plural(privateCount, "has", "have")} private access` : null, sharedCount > 0 ? `${sharedCount} ${plural(sharedCount, "has", "have")} shared access` : null].filter(Boolean).join(" and ")}.`,
      });
    }
    if (theme.key === "dogs" && maxDogs > 0) {
      faq.push({
        question: "How many dogs are allowed?",
        answer: `Up to ${maxDogs} ${plural(maxDogs, "dog", "dogs")} depending on the cabin${dogsFreeCount > 0 ? `; ${dogsFreeCount} ${plural(dogsFreeCount, "cabin charges", "cabins charge")} no pet fee` : ""}. Weight limits and fees are shown on each listing.`,
      });
    }
    faq.push({ question: "Does Kabanalouer charge service fees?", answer: "No. You contact the owner directly, with no service fees or commission." });
  } else {
    faq.push({
      question: `Combien y a-t-il de ${nounOther} ${place} ?`,
      answer: `En ce moment, Kabanalouer propose ${count} ${noun(count)} ${place}.`,
    });
    if (!cityName && cities.length > 0) {
      faq.push({
        question: `Dans quelles villes trouver un ${nounOne} ${place} ?`,
        answer: `En ce moment : ${joinList(cities.map(([c, n]) => `${c} (${n})`), false)}.`,
      });
    }
    if (capacityText) {
      faq.push({
        question: "Combien de personnes peuvent séjourner ?",
        answer: `Les chalets de cette page accueillent ${capacityText}, avec jusqu'à ${maxBedrooms} ${plural(maxBedrooms, "chambre", "chambres")}. La capacité est indiquée sur chaque fiche.`,
      });
    }
    if (minPrice !== null) {
      faq.push({
        question: `Combien coûte un ${nounOne} ${place} ?`,
        answer: `En ce moment, les prix commencent à ${formatPrice(minPrice, locale)}/nuit. Le propriétaire confirme directement le prix final pour vos dates.`,
      });
    }
    if (theme.accessQuestionFr && privateCount + sharedCount > 0) {
      faq.push({
        question: theme.accessQuestionFr,
        answer: `Ça dépend du chalet. En ce moment, ${[privateCount > 0 ? `${privateCount} ${plural(privateCount, "a", "ont")} un accès privé` : null, sharedCount > 0 ? `${sharedCount} ${plural(sharedCount, "a", "ont")} un accès partagé` : null].filter(Boolean).join(" et ")}.`,
      });
    }
    if (theme.key === "dogs" && maxDogs > 0) {
      faq.push({
        question: "Combien de chiens sont acceptés ?",
        answer: `Jusqu'à ${maxDogs} ${plural(maxDogs, "chien", "chiens")} selon le chalet${dogsFreeCount > 0 ? ` ; ${dogsFreeCount} ${plural(dogsFreeCount, "chalet ne demande", "chalets ne demandent")} aucuns frais` : ""}. Le poids accepté et les frais sont indiqués sur chaque fiche.`,
      });
    }
    faq.push({ question: "Est-ce que Kabanalouer charge des frais de service ?", answer: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission." });
  }

  // ── Maillage interne (pages actives seulement, jamais la page courante) ──
  const toChip = (link: ComboLink, label: string) => ({
    href: comboPath(link.theme, link.region, link.city, isEn),
    label,
    count: link.count,
  });
  const cityLinks = activeCitiesForTheme(index, theme.key, regionConfig)
    .filter((l) => l.city !== cityName)
    .map((l) => toChip(l, l.city!));
  const otherThemeLinks = (cityName ? activeThemesInCity(index, regionConfig, cityName) : activeThemesInRegion(index, regionConfig))
    .filter((l) => l.theme.key !== theme.key)
    .map((l) => toChip(l, comboLinkLabel(l, isEn, { withPlace: false })));
  const otherRegionLinks = activeRegionsForTheme(index, theme.key)
    .filter((l) => l.region.slug !== regionConfig.slug)
    .map((l) => toChip(l, isEn ? l.region.nameEn : l.region.name));
  const regionCombo = cityName ? activeThemesInRegion(index, regionConfig).find((l) => l.theme.key === theme.key) : undefined;
  const seeAlsoLinks = [
    ...(regionCombo ? [{ href: comboPath(theme, regionConfig, null, isEn), label: comboLinkLabel(regionCombo, isEn) }] : []),
    ...(cityName && cityPath ? [{ href: cityPath, label: isEn ? `All cabins in ${cityName}` : `Tous les chalets à ${cityName}` }] : []),
    { href: regionPath, label: isEn ? `All cabins ${comboPlace(regionConfig, null, true)}` : `Tous les chalets ${regionConfig.locative}` },
    { href: parentThemePath, label: isEn ? `${theme.linkEn} in Quebec` : `${theme.linkFr} au Québec` },
  ];

  // ── JSON-LD ──
  const crumbs = [
    { name: isEn ? "Home" : "Accueil", path: isEn ? "/en" : "/" },
    { name: isEn ? "Cabins" : "Chalets", path: isEn ? "/en/cabins" : "/chalets" },
    { name: regionName, path: regionPath },
    ...(cityName && cityPath ? [{ name: cityName, path: cityPath }] : []),
    { name: themeLabel, path: selfPath },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    numberOfItems: count,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LodgingBusiness",
        name: l.title,
        url: `${SITE_URL}${buildListingPath({ region: l.region, city: l.city ?? null, listing_number: l.listing_number ?? null, custom_slug: l.custom_slug ?? null }, isEn ? "en" : "fr") ?? `/chalets/${l.id}`}`,
        address: { "@type": "PostalAddress", addressLocality: l.city ?? regionName, addressRegion: regionName, addressCountry: "CA" },
        ...(l.featureLine ? { amenityFeature: { "@type": "LocationFeatureSpecification", name: l.featureLine, value: true } } : {}),
      },
    })),
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
  };

  const crumbLinkClass = "inline-block py-2 -my-2 hover:text-primary hover:underline transition-colors";

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
            <Link href={isEn ? "/en/cabins" : "/chalets"} className={crumbLinkClass}>{isEn ? "Cabins" : "Chalets"}</Link>
            <span>›</span>
            <Link href={regionPath} className={crumbLinkClass}>{regionName}</Link>
            {cityName && cityPath && (
              <>
                <span>›</span>
                <Link href={cityPath} className={crumbLinkClass}>{cityName}</Link>
              </>
            )}
            <span>›</span>
            <span className="text-charcoal-600">{themeLabel}</span>
          </nav>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ThemeIcon theme={theme} className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">{h1}</h1>
          <p className="text-base text-charcoal-500 mb-8">{intro}</p>
          <div className="flex justify-center">
            <SearchBar
              initialRegion={cityName ? undefined : regionConfig.dbValue}
              initialCity={cityName ?? undefined}
              initialPets={theme.key === "dogs" ? 1 : undefined}
              preserveParams={theme.key === "dogs" ? undefined : theme.searchParams}
            />
          </div>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-heading-2 font-bold text-charcoal-900">{`${count} ${noun(count)} ${place}`}</h2>
            <p className="text-charcoal-500 mt-1 text-sm">
              {isEn ? "Direct contact · No service fees" : "Contact direct · Aucuns frais de service"}
            </p>
          </div>
          <Link href={searchPath} className={`text-sm hidden md:block shrink-0 ${TEXT_LINK_CLASSNAME}`}>
            {isEn ? `See all ${nounOther} ${place} →` : `Voir tous les ${nounOther} ${place} →`}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id}>
              <ListingCard listing={listing} currentUserId={user?.id ?? null} />
              {listing.featureLine && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-600">
                  <ThemeIcon theme={theme} className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{listing.featureLine}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Maillage : villes, autres types, autres régions ── */}
      {(cityLinks.length > 0 || otherThemeLinks.length > 0 || otherRegionLinks.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full space-y-10">
          <ComboLinkChips
            title={cityName
              ? (isEn ? `${themeLabel} in other towns ${comboPlace(regionConfig, null, true)}` : `${themeLabel} dans d'autres villes ${regionConfig.locative}`)
              : (isEn ? `${themeLabel} by town ${place}` : `${themeLabel} par ville ${place}`)}
            links={cityLinks}
          />
          <ComboLinkChips
            title={isEn ? `Other types of cabins ${place}` : `Autres types de chalets ${place}`}
            links={otherThemeLinks}
          />
          <ComboLinkChips
            title={isEn ? `${themeLabel} in other regions` : `${themeLabel} dans d'autres régions`}
            links={otherRegionLinks}
          />
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="bg-charcoal-50 py-16">
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
            <LandingSearchCta href={searchPath} isEn={isEn} />
          </div>
        </div>
      </section>

      {/* ── Voir aussi : pages parentes ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <ComboLinkChips title={isEn ? "See also" : "Voir aussi"} links={seeAlsoLinks} />
      </section>

      </main>

      <OwnersSection />
      <Footer />
    </div>
  );
}
