import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import AccessibilityIcon from "@/components/AccessibilityIcon";
import { createClient } from "@/lib/supabase/server";
import { normalizePhotos } from "@/lib/photo";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { safeJsonLd } from "@/lib/jsonLd";
import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";
import { REGIONS } from "@/lib/regions";
import {
  ACCESSIBILITY_COLUMNS, ACCESSIBILITY_GROUPS, ACCESSIBLE_PATH_EN, ACCESSIBLE_PATH_FR,
  accessibilityFeatureLabel, accessibilityShortSummary, parseAccessibility,
  type AccessibilityFeatureId, type AccessibilityInfo,
} from "@/lib/accessibility";

// Page SEO/GEO « location chalet accessible mobilité réduite »
// (/chalets/accessible-mobilite-reduite, /en/cabins/wheelchair-accessible).
// Même patron que DogFriendlyLanding.tsx : réponses de la FAQ calculées sur
// les vraies fiches, jamais un chiffre inventé.

type AccessibleListing = Listing & { accessibility: AccessibilityInfo };

function plural(n: number, one: string, other: string) {
  return n > 1 ? other : one;
}

export function buildAccessibleMeta(isEn: boolean) {
  return {
    title: isEn ? "Accessible cabin rentals for reduced mobility in Quebec" : "Location de chalet accessible aux personnes à mobilité réduite",
    description: isEn
      ? "Find a cabin for rent in Quebec adapted to people with reduced mobility: step-free entrance, roll-in shower, grab bars, full ground floor. Details on every listing, direct contact with owners."
      : "Trouvez un chalet à louer au Québec adapté aux personnes à mobilité réduite : entrée de plain-pied, douche sans seuil, barres d'appui, rez-de-chaussée complet. Détails sur chaque fiche, contact direct avec les propriétaires.",
  };
}

export default async function AccessibleLanding() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      `id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug, ${ACCESSIBILITY_COLUMNS}`
    )
    .eq("is_published", true)
    .eq("reduced_mobility", true)
    .order("created_at", { ascending: false });

  const listings: AccessibleListing[] = (rawListings ?? []).map((l) => ({
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
    accessibility: parseAccessibility(l as Record<string, unknown>),
  }));

  const count = listings.length;
  const withFeature = (id: AccessibilityFeatureId) => listings.filter((l) => l.accessibility.features.includes(id)).length;
  const showerCount = withFeature("step_free_shower");
  const groundFloorCount = withFeature("ground_floor_living");
  const entranceCount = withFeature("step_free_entrance");

  const regionCounts = REGIONS
    .map((r) => ({ region: r, count: listings.filter((l) => l.region === r.dbValue).length }))
    .filter((r) => r.count > 0);

  const pagePath = isEn ? ACCESSIBLE_PATH_EN : ACCESSIBLE_PATH_FR;
  const searchPath = (regionDbValue: string) => {
    const params = new URLSearchParams({ accessible: "1", region: regionDbValue });
    return localePath(`/chalets?${params.toString()}`, locale);
  };

  const criteriaList = ACCESSIBILITY_GROUPS
    .map((g) => `${(isEn ? g.labelEn : g.label).toLowerCase()} (${g.features.map((f) => accessibilityFeatureLabel(f.id, locale).split(" (")[0].toLowerCase()).join(", ")})`)
    .join(isEn ? "; " : " ; ");

  const statAnswer = (n: number, fr: string, en: string) =>
    isEn
      ? `Right now, ${n} out of ${count} accessible ${plural(count, "cabin", "cabins")} on Kabanalouer ${plural(n, "has", "have")} ${en}. Each listing shows exactly which features are available.`
      : `En ce moment, ${n} ${plural(n, "chalet", "chalets")} sur ${count} ${plural(n, "offre", "offrent")} ${fr}. Chaque fiche indique précisément les éléments disponibles.`;

  const faq: { question: string; answer: string }[] = isEn
    ? [
        {
          question: "How do I find a cabin accessible to people with reduced mobility in Quebec?",
          answer: `Every cabin on this page was declared accessible by its owner${count > 0 ? ` (${count} ${plural(count, "cabin", "cabins")} right now)` : ""}. Each listing details the entrance, bathroom and bedroom features. You can also turn on the "Accessible to people with reduced mobility" filter in the search.`,
        },
        {
          question: "Which accessibility features are listed?",
          answer: `Owners can specify 9 features in 3 areas: ${criteriaList}.`,
        },
        ...(count > 0
          ? [
              { question: "Are there cabins with a roll-in shower?", answer: statAnswer(showerCount, "", "a step-free (roll-in) shower") },
              { question: "Are there cabins with everything on one level?", answer: statAnswer(groundFloorCount, "", "a full ground floor (bedroom, living room and kitchen with no steps)") },
            ]
          : []),
        {
          question: "How can I make sure the cabin meets my needs?",
          answer: "Contact the owner directly through the listing to ask for measurements or photos of the entrance, bathroom and bedroom. There are no service fees or commission.",
        },
      ]
    : [
        {
          question: "Comment trouver un chalet accessible aux personnes à mobilité réduite au Québec ?",
          answer: `Tous les chalets de cette page ont été déclarés accessibles par leur propriétaire${count > 0 ? ` (${count} ${plural(count, "chalet", "chalets")} en ce moment)` : ""}. Chaque fiche détaille l'entrée, la salle de bain, la chambre et la circulation. Vous pouvez aussi activer le filtre « Accessible aux personnes à mobilité réduite » dans la recherche.`,
        },
        {
          question: "Quels critères d'accessibilité sont indiqués ?",
          answer: `Les propriétaires peuvent préciser 9 éléments répartis en 3 zones : ${criteriaList}.`,
        },
        ...(count > 0
          ? [
              { question: "Y a-t-il des chalets avec une douche sans seuil ?", answer: statAnswer(showerCount, "une douche sans seuil (italienne ou de plain-pied)", "") },
              { question: "Y a-t-il des chalets entièrement de plain-pied ?", answer: statAnswer(groundFloorCount, "un rez-de-chaussée complet (chambre, salon et cuisine accessibles sans marches)", "") },
            ]
          : []),
        {
          question: "Comment m'assurer que le chalet convient à mes besoins ?",
          answer: "Contactez directement le propriétaire depuis la fiche pour lui demander des mesures ou des photos de l'entrée, de la salle de bain et de la chambre. Aucuns frais de service ni commission.",
        },
      ];

  const tips: { title: string; body: string }[] = isEn
    ? [
        { title: "Compare the measurements", body: "Door widths, thresholds and turning space are listed in inches and centimetres. Compare them with your wheelchair or walker." },
        { title: "Ask for photos", body: "Photos of the entrance, shower and bedroom help you check the layout before booking." },
        { title: "Think about the way in", body: "Ask about the path from the parking to the door: gravel, slope, snow clearing in winter." },
        { title: "Share your needs", body: "Describe your needs in your first message: the owner can confirm what fits and what doesn't." },
      ]
    : [
        { title: "Comparez les mesures", body: "La largeur des portes, les seuils et l'espace de rotation sont indiqués en centimètres et en pouces. Comparez-les à votre fauteuil ou à votre marchette." },
        { title: "Demandez des photos", body: "Des photos de l'entrée, de la douche et de la chambre permettent de valider l'aménagement avant de réserver." },
        { title: "Pensez au trajet jusqu'à la porte", body: "Informez-vous sur le chemin entre le stationnement et l'entrée : gravier, pente, déneigement l'hiver." },
        { title: "Précisez vos besoins", body: "Décrivez vos besoins dès le premier message : le propriétaire peut confirmer ce qui convient et ce qui ne convient pas." },
      ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Accueil", item: `${SITE_URL}${isEn ? "/en" : "/"}` },
      { "@type": "ListItem", position: 2, name: isEn ? "Cabins" : "Chalets", item: `${SITE_URL}${localePath("/chalets", locale)}` },
      { "@type": "ListItem", position: 3, name: isEn ? "Accessible cabins" : "Chalets accessibles", item: `${SITE_URL}${pagePath}` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isEn ? "Cabins for rent accessible to people with reduced mobility in Quebec" : "Chalets à louer accessibles aux personnes à mobilité réduite au Québec",
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
          addressLocality: l.city ?? l.region,
          addressRegion: l.region,
          addressCountry: "CA",
        },
        amenityFeature: l.accessibility.features.map((id) => ({
          "@type": "LocationFeatureSpecification",
          name: accessibilityFeatureLabel(id, locale),
          value: true,
        })),
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

      {/* ── Hero ── */}
      <section className="bg-charcoal-50 border-b border-charcoal-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-sm text-charcoal-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap">
            <Link href={localePath("/chalets", locale)} className="hover:text-primary hover:underline transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <span className="text-charcoal-600">{isEn ? "Accessible" : "Mobilité réduite"}</span>
          </nav>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <AccessibilityIcon className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            {isEn ? "Accessible cabin rentals for people with reduced mobility" : "Location de chalet accessible aux personnes à mobilité réduite"}
          </h1>
          <p className="text-base text-charcoal-500 mb-8">
            {isEn
              ? "Cabins in Quebec adapted to people with reduced mobility. Every listing details the entrance, bathroom, bedroom and circulation, with measurements. Direct contact with owners, no service fees."
              : "Des chalets au Québec adaptés aux personnes à mobilité réduite. Chaque fiche détaille l'entrée, la salle de bain, la chambre et la circulation, avec les mesures. Contact direct avec les propriétaires, aucuns frais de service."}
          </p>
          <div className="flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <h2 className="text-heading-2 font-bold text-charcoal-900">
          {isEn
            ? `${count} accessible ${plural(count, "cabin", "cabins")}`
            : `${count} ${plural(count, "chalet accessible", "chalets accessibles")}`}
        </h2>
        <p className="text-charcoal-500 mt-1 mb-8 text-sm">
          {isEn ? "Direct contact · No service fees" : "Contact direct · Aucuns frais de service"}
        </p>

        {count === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-charcoal-800 mb-1">
              {isEn ? "No accessible cabins yet" : "Aucun chalet accessible pour le moment"}
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
            {listings.map((listing) => {
              const summary = accessibilityShortSummary(listing.accessibility, locale);
              return (
                <div key={listing.id}>
                  <ListingCard listing={listing} currentUserId={user?.id ?? null} />
                  {summary && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-600">
                      <AccessibilityIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{summary}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── By region ── */}
      {regionCounts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h2 className="text-heading-2 font-bold text-charcoal-900 mb-4">
            {isEn ? "Accessible cabins by region" : "Chalets accessibles par région"}
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

      {/* ── Criteria ── */}
      <section className="bg-charcoal-50 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-2">
            {isEn ? "What the owners specify" : "Ce que les propriétaires précisent"}
          </h2>
          <p className="text-base text-charcoal-500 mb-8">
            {isEn
              ? "Each accessible listing shows which of these 9 features are available."
              : "Chaque fiche accessible indique lesquels de ces 9 éléments sont présents."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ACCESSIBILITY_GROUPS.map((group) => (
              <div key={group.id} className="bg-white rounded-2xl border border-[#ebebeb] p-5">
                <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-3">{isEn ? group.labelEn : group.label}</h3>
                <ul className="space-y-2 text-base text-charcoal-500">
                  {group.features.map((f) => (
                    <li key={f.id} className="flex gap-2">
                      <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span>{isEn ? f.labelEn : f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {count > 0 && entranceCount > 0 && (
            <p className="text-sm text-charcoal-500 mt-6">
              {isEn
                ? `${entranceCount} of the ${count} accessible ${plural(count, "cabin", "cabins")} ${plural(entranceCount, "has", "have")} step-free access or a ramp.`
                : `${entranceCount} ${plural(entranceCount, "chalet", "chalets")} sur ${count} ${plural(entranceCount, "offre", "offrent")} un accès de plain-pied ou une rampe.`}
            </p>
          )}
        </div>
      </section>

      {/* ── Tips ── */}
      <section className="bg-white py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
            {isEn ? "Before booking an accessible cabin" : "Avant de réserver un chalet accessible"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tips.map((tip) => (
              <div key={tip.title} className="rounded-2xl border border-[#ebebeb] p-5">
                <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{tip.title}</h3>
                <p className="text-base text-charcoal-500 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-charcoal-50 py-16">
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

      <Footer />
    </div>
  );
}
