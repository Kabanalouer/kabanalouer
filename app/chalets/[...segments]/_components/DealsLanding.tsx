import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { safeJsonLd } from "@/lib/jsonLd";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { REGIONS, getRegionByDbValue } from "@/lib/regions";
import {
  DEALS_PATH_EN, DEALS_PATH_FR, PROMO_DISPLAY_COLUMNS,
  formatPromoLines, promoFamily, visiblePromoFilter,
  type PromoDisplay, type PromoFamily,
} from "@/lib/promoLabel";

// Page SEO « chalets à louer pas chers » (/chalets/pas-cher, /en/cabins/deals) :
// tous les chalets publiés qui ont une promo visible aujourd'hui. Même patron
// que DogFriendlyLanding.tsx. Les chiffres de la FAQ viennent des vraies promos.

type DealListing = Listing & { promo: PromoDisplay; family: PromoFamily };

const LISTING_COLUMNS = "id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug";

function plural(n: number, one: string, other: string) {
  return n > 1 ? other : one;
}

export function buildDealsMeta(isEn: boolean) {
  return {
    title: isEn
      ? "Cheap cabin rentals in Quebec – Discounts and deals"
      : "Chalets à louer pas chers au Québec – Rabais et promos",
    description: isEn
      ? "Cabins for rent in Quebec with an active deal: discounts, free nights and last-minute offers. Direct contact with owners, no service fees."
      : "Chalets à louer au Québec avec une promo en cours : rabais, nuit gratuite et offres de dernière minute. Contact direct avec les propriétaires, aucuns frais de service.",
  };
}

// Nombre de chalets publiés avec une promo visible aujourd'hui (seuil d'indexation)
export async function countDealListings(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: promos } = await supabase
    .from("promotions")
    .select("listing_id")
    .eq("is_active", true)
    .or(visiblePromoFilter(today));
  const ids = [...new Set((promos ?? []).map((p) => p.listing_id as string))];
  if (ids.length === 0) return 0;
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .in("id", ids);
  return count ?? 0;
}

function toListing(l: Record<string, unknown>, locale: string, isEn: boolean): Listing {
  return {
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
    tags: Array.isArray(l.amenities) ? getAmenityLabels(l.amenities as AmenityValue[], locale).slice(0, 3) : [],
  };
}

export default async function DealsLanding({ filter }: { filter?: string }) {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const today = new Date().toISOString().split("T")[0];
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Promos visibles aujourd'hui (la plus récente par chalet)
  const { data: promoRows } = await supabase
    .from("promotions")
    .select(`listing_id, created_at, ${PROMO_DISPLAY_COLUMNS}`)
    .eq("is_active", true)
    .or(visiblePromoFilter(today))
    .order("created_at", { ascending: false });
  const promoByListing = new Map<string, PromoDisplay>();
  for (const p of promoRows ?? []) {
    const lid = p.listing_id as string;
    if (!promoByListing.has(lid)) promoByListing.set(lid, p as unknown as PromoDisplay);
  }

  const { data: rawListings } = promoByListing.size > 0
    ? await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("is_published", true)
        .in("id", [...promoByListing.keys()])
        .order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const allDeals: DealListing[] = (rawListings ?? []).map((l) => {
    const promo = promoByListing.get(l.id as string)!;
    return {
      ...toListing(l as Record<string, unknown>, locale, isEn),
      hasPromo: true,
      promoData: promo,
      promo,
      family: promoFamily(promo.type),
    };
  });

  // ?type= : valeurs françaises sur /chalets/pas-cher, anglaises sur
  // /en/cabins/deals — les deux jeux sont acceptés dans les deux langues.
  const families: { id: PromoFamily; slugEn: string; label: string }[] = [
    { id: "rabais",          slugEn: "discounts",   label: isEn ? "Discounts" : "Rabais" },
    { id: "nuit-gratuite",   slugEn: "free-night",  label: isEn ? "Free night" : "Nuit gratuite" },
    { id: "derniere-minute", slugEn: "last-minute", label: isEn ? "Last minute" : "Dernière minute" },
  ];
  const activeFamily = families.find((f) => f.id === filter || f.slugEn === filter)?.id ?? null;
  const deals = activeFamily ? allDeals.filter((d) => d.family === activeFamily) : allDeals;

  const count = allDeals.length;
  const familyCount = (id: PromoFamily) => allDeals.filter((d) => d.family === id).length;
  const discountCount = familyCount("rabais");
  const freeNightCount = familyCount("nuit-gratuite");
  const lastMinuteCount = familyCount("derniere-minute");

  // Peu ou pas de promos : on suggère les derniers chalets publiés pour que la
  // page reste utile
  const { data: rawSuggestions } = count < 3
    ? await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as Record<string, unknown>[] };
  const suggestions: Listing[] = (rawSuggestions ?? [])
    .filter((l) => !promoByListing.has(l.id as string))
    .map((l) => toListing(l as Record<string, unknown>, locale, isEn));

  const regionCounts = REGIONS
    .map((r) => ({ region: r, count: allDeals.filter((l) => l.region === r.dbValue).length }))
    .filter((r) => r.count > 0);

  const pagePath = isEn ? DEALS_PATH_EN : DEALS_PATH_FR;
  const regionName = (dbValue: string) => (isEn ? getRegionByDbValue(dbValue)?.nameEn ?? dbValue : dbValue);
  const filterHref = (f: PromoFamily | null) => {
    if (!f) return pagePath;
    const value = isEn ? families.find((fam) => fam.id === f)?.slugEn ?? f : f;
    return `${pagePath}?type=${value}`;
  };

  const faq: { question: string; answer: string }[] = isEn
    ? [
        {
          question: "How do I find a cheap cabin to rent in Quebec?",
          answer: `This page lists every cabin on Kabanalouer with an active deal${count > 0 ? ` (${count} ${plural(count, "cabin", "cabins")} right now)` : ""}. Owners offer discounts on certain stay dates, free nights on longer stays, and last-minute prices on dates that are still free. Since you contact owners directly, there are no service fees on top.`,
        },
        {
          question: "What kinds of deals are available?",
          answer: count > 0
            ? `Right now: ${discountCount} ${plural(discountCount, "discount", "discounts")} (in % or $ per night), ${freeNightCount} free-night ${plural(freeNightCount, "offer", "offers")} and ${lastMinuteCount} last-minute ${plural(lastMinuteCount, "deal", "deals")}. Each cabin shows the exact conditions of its deal.`
            : "Owners can offer a discount (in % or $ per night), a free night on stays of 2 nights or more, or a last-minute discount. Each cabin shows the exact conditions of its deal.",
        },
        {
          question: "What is a last-minute cabin deal?",
          answer: "It's a discount on stays starting soon: the owner lowers the price for bookings made a few days (7 to 21) before arrival, to fill dates that are still free.",
        },
        {
          question: "When is it cheapest to rent a cabin?",
          answer: "Weekdays (Sunday to Thursday) and the shoulder seasons, between the big holiday periods, are usually the least expensive. Booking dates are also a good opportunity: some owners offer a discount for bookings made during a set period, whatever the stay dates.",
        },
        {
          question: "Does Kabanalouer charge service fees?",
          answer: "No. You contact the owner directly, with no service fees or commission. The deal shown on the cabin is confirmed with the owner.",
        },
      ]
    : [
        {
          question: "Comment trouver un chalet à louer pas cher au Québec ?",
          answer: `Cette page regroupe tous les chalets de Kabanalouer qui ont une promo en cours${count > 0 ? ` (${count} ${plural(count, "chalet", "chalets")} en ce moment)` : ""}. Les propriétaires offrent des rabais sur certaines dates, des nuits gratuites pour les séjours plus longs et des prix de dernière minute sur les dates encore libres. Comme vous contactez les propriétaires directement, il n'y a aucuns frais de service en plus.`,
        },
        {
          question: "Quels types de promos sont offerts ?",
          answer: count > 0
            ? `En ce moment : ${discountCount} rabais (en % ou en $ par nuit), ${freeNightCount} ${plural(freeNightCount, "offre", "offres")} de nuit gratuite et ${lastMinuteCount} ${plural(lastMinuteCount, "promo", "promos")} de dernière minute. Chaque chalet indique les conditions exactes de sa promo.`
            : "Les propriétaires peuvent offrir un rabais (en % ou en $ par nuit), une nuit gratuite pour les séjours de 2 nuits et plus, ou un rabais de dernière minute. Chaque chalet indique les conditions exactes de sa promo.",
        },
        {
          question: "C'est quoi une promo de dernière minute ?",
          answer: "C'est un rabais sur les séjours qui commencent bientôt : le propriétaire baisse son prix pour les réservations faites quelques jours (7 à 21) avant l'arrivée, afin de remplir les dates encore libres.",
        },
        {
          question: "Quand est-ce le moins cher de louer un chalet ?",
          answer: "La semaine (du dimanche au jeudi) et les périodes entre les grandes saisons sont généralement les moins chères. Les promos sur les dates de réservation sont aussi une belle occasion : certains propriétaires offrent un rabais pour toutes réservations faites pendant une période donnée, peu importe la date du séjour.",
        },
        {
          question: "Est-ce que Kabanalouer charge des frais de service ?",
          answer: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission. La promo affichée sur le chalet se confirme avec le propriétaire.",
        },
      ];

  const tips: { title: string; body: string }[] = isEn
    ? [
        { title: "Be flexible on dates", body: "Weekdays and dates between the big holiday periods are often discounted. Check a few options before choosing." },
        { title: "Stay one more night", body: "With a free-night offer, a longer stay can cost barely more than a short one." },
        { title: "Look at booking deadlines", body: "Some deals only apply to bookings made during a set period. Check the dates shown on the cabin." },
        { title: "Contact the owner directly", body: "Mention the deal in your message: the owner confirms the final price for your dates, with no service fees." },
      ]
    : [
        { title: "Soyez flexible sur les dates", body: "La semaine et les dates entre les grandes périodes de vacances sont souvent en promo. Comparez quelques options avant de choisir." },
        { title: "Restez une nuit de plus", body: "Avec une offre de nuit gratuite, un séjour plus long peut coûter à peine plus cher qu'un court séjour." },
        { title: "Surveillez les dates de réservation", body: "Certaines promos s'appliquent seulement aux réservations faites pendant une période donnée. Vérifiez les dates indiquées sur le chalet." },
        { title: "Contactez le proprio directement", body: "Mentionnez la promo dans votre message : le propriétaire confirme le prix final pour vos dates, sans frais de service." },
      ];

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Accueil", item: `${SITE_URL}${isEn ? "/en" : "/"}` },
      { "@type": "ListItem", position: 2, name: isEn ? "Cabins" : "Chalets", item: `${SITE_URL}${localePath("/chalets", locale)}` },
      { "@type": "ListItem", position: 3, name: isEn ? "Cabin deals" : "Chalets pas chers", item: `${SITE_URL}${pagePath}` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isEn ? "Cabins for rent in Quebec with an active deal" : "Chalets à louer au Québec avec une promo en cours",
    numberOfItems: count,
    itemListElement: allDeals.map((l, i) => {
      const lines = formatPromoLines(l.promo, locale);
      return {
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
          description: [lines.line1, lines.line2].filter(Boolean).join(" — "),
        },
      };
    }),
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
            <span className="text-charcoal-600">{isEn ? "Deals" : "Pas chers"}</span>
          </nav>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            {isEn ? "Cheap cabin rentals in Quebec" : "Chalets à louer pas chers au Québec"}
          </h1>
          <p className="text-base text-charcoal-500">
            {isEn
              ? "All the cabins with a deal right now: discounts, free nights and last-minute offers. Direct contact with owners, no service fees."
              : "Tous les chalets en promo en ce moment : rabais, nuit gratuite et offres de dernière minute. Contact direct avec les propriétaires, aucuns frais de service."}
          </p>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {count > 0 && (
          <>
            <h2 className="text-heading-2 font-bold text-charcoal-900">
              {isEn
                ? `${count} ${plural(count, "cabin", "cabins")} on sale`
                : `${count} ${plural(count, "chalet", "chalets")} en promo`}
            </h2>
            <p className="text-charcoal-500 mt-1 mb-6 text-sm">
              {isEn ? "Direct contact · No service fees" : "Contact direct · Aucuns frais de service"}
            </p>
          </>
        )}

        {count > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {[{ id: null, label: isEn ? "All" : "Toutes", n: count }, ...families.map((f) => ({ ...f, n: familyCount(f.id) }))].map((f) => {
              const selected = activeFamily === f.id;
              return (
                <Link
                  key={f.id ?? "all"}
                  href={filterHref(f.id)}
                  scroll={false}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${selected ? "border-primary bg-primary text-white" : "border-charcoal-100 text-charcoal-700 hover:border-primary hover:text-primary hover:bg-primary/5"}`}
                >
                  {f.label} ({f.n})
                </Link>
              );
            })}
          </div>
        )}

        {count === 0 ? (
          <div className="py-4 text-center">
            <p className="font-semibold text-charcoal-800 mb-1">
              {isEn ? "No deals right now" : "Aucune promo en ce moment"}
            </p>
            <p className="text-base text-charcoal-400">
              {isEn
                ? "Owners add new deals regularly. Come back soon, or browse our cabins below."
                : "Les propriétaires ajoutent régulièrement de nouvelles promos. Revenez bientôt, ou découvrez nos chalets ci-dessous."}
            </p>
          </div>
        ) : deals.length === 0 ? (
          <p className="py-12 text-center text-base text-charcoal-400">
            {isEn ? "No cabins with this type of deal right now." : "Aucun chalet avec ce type de promo en ce moment."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((listing) => {
              const { line2 } = formatPromoLines(listing.promo, locale);
              return (
                <div key={listing.id}>
                  <ListingCard listing={listing} currentUserId={user?.id ?? null} />
                  {line2 && <p className="mt-2 text-sm text-charcoal-600">{line2}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Suggestions (peu de promos) ── */}
      {suggestions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-6">
            {isEn ? "Discover our cabins" : "Découvrez nos chalets"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((listing) => (
              <ListingCard key={listing.id} listing={listing} currentUserId={user?.id ?? null} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={localePath("/chalets", locale)}
              className="inline-flex bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {isEn ? "See all cabins" : "Voir tous les chalets"}
            </Link>
          </div>
        </section>
      )}

      {/* ── By region ── */}
      {regionCounts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
            {isEn ? "Cabin deals by region" : "Chalets en promo par région"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {regionCounts.map(({ region, count: n }) => (
              <Link
                key={region.slug}
                href={localePath(`/chalets?region=${encodeURIComponent(region.dbValue)}`, locale)}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
            {isEn ? "How to pay less for your cabin" : "Comment payer moins cher votre chalet"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tips.map((tip) => (
              <div key={tip.title} className="bg-white rounded-2xl border border-[#ebebeb] p-5">
                <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{tip.title}</h3>
                <p className="text-base text-charcoal-500 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
