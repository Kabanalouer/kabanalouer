import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard, { type Listing } from "@/components/ListingCard";
import PawIcon from "@/components/PawIcon";
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
  DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR, DOG_POLICY_COLUMNS,
  dogPolicyShortSummary, parseDogPolicy, type DogPolicy,
} from "@/lib/dogPolicy";

// Page SEO/GEO « location chalet avec chien » (/chalets/chiens-acceptes,
// /en/cabins/dog-friendly). Même patron que CityLanding.tsx. Les réponses de
// la FAQ sont calculées à partir des vraies fiches (nombre de chalets
// gratuits, toutes tailles…) — jamais un chiffre inventé.

type DogListing = Listing & { dogPolicy: DogPolicy };

function plural(n: number, one: string, other: string) {
  return n > 1 ? other : one;
}

export function buildDogFriendlyMeta(isEn: boolean) {
  return {
    title: isEn ? "Dog-friendly cabin rentals in Quebec" : "Location de chalet avec chien au Québec",
    description: isEn
      ? "Find a dog-friendly cabin for rent in Quebec. Number of dogs, weight limits and fees are listed on every cabin. Direct contact with owners, no service fees."
      : "Trouvez un chalet à louer où les chiens sont acceptés au Québec. Nombre de chiens, poids et frais indiqués sur chaque fiche. Contact direct avec les propriétaires, aucuns frais de service.",
  };
}

export default async function DogFriendlyLanding() {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawListings } = await supabase
    .from("listings")
    .select(
      `id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, amenities, listing_number, custom_slug, ${DOG_POLICY_COLUMNS}`
    )
    .eq("is_published", true)
    .eq("dogs_allowed", true)
    .order("created_at", { ascending: false });

  const listings: DogListing[] = (rawListings ?? []).map((l) => ({
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
    dogPolicy: parseDogPolicy(l as Record<string, unknown>),
  }));

  const count = listings.length;
  const freeCount = listings.filter((l) => l.dogPolicy.feeType === "free").length;
  const allSizesCount = listings.filter((l) => l.dogPolicy.sizeLimit === "all").length;
  const maxDogs = listings.reduce((m, l) => Math.max(m, l.dogPolicy.max ?? 0), 0);

  const regionCounts = REGIONS
    .map((r) => ({ region: r, count: listings.filter((l) => l.region === r.dbValue).length }))
    .filter((r) => r.count > 0);

  const pagePath = isEn ? DOG_FRIENDLY_PATH_EN : DOG_FRIENDLY_PATH_FR;
  const searchPath = (regionDbValue?: string) => {
    const params = new URLSearchParams({ dogs: "1" });
    if (regionDbValue) params.set("region", regionDbValue);
    return localePath(`/chalets?${params.toString()}`, locale);
  };

  const faq: { question: string; answer: string }[] = isEn
    ? [
        {
          question: "How do I find a dog-friendly cabin in Quebec?",
          answer: `Every cabin on this page allows dogs${count > 0 ? ` (${count} ${plural(count, "cabin", "cabins")} right now)` : ""}. Owners list the maximum number of dogs, weight limits and any extra fees directly on each cabin. You can also turn on the "Dogs allowed" filter in the search.`,
        },
        {
          question: "Is there an extra fee for bringing a dog?",
          answer: count > 0
            ? `It depends on the cabin. Right now, ${freeCount} out of ${count} dog-friendly ${plural(count, "cabin", "cabins")} on Kabanalouer ${plural(freeCount, "charges", "charge")} no extra fee for dogs. Any fee is shown per night or per stay on the listing.`
            : "It depends on the cabin. Each owner shows whether dogs are free or subject to a fee per night or per stay.",
        },
        {
          question: "Are large dogs allowed?",
          answer: count > 0
            ? `Right now, ${allSizesCount} out of ${count} dog-friendly ${plural(count, "cabin", "cabins")} ${plural(allSizesCount, "welcomes", "welcome")} dogs of all sizes. Some cabins are limited to small dogs (25 lbs and under) or medium dogs (50 lbs and under); the limit is shown on each listing.`
            : "Some cabins welcome dogs of all sizes, others are limited to small dogs (25 lbs and under) or medium dogs (50 lbs and under). The limit is shown on each listing.",
        },
        {
          question: "How many dogs can I bring?",
          answer: `Each owner sets a maximum, from 1 to 5 dogs${maxDogs > 1 ? ` (up to ${maxDogs} on the cabins listed right now)` : ""}. Enter your number of dogs in the search to only see cabins that can host them all.`,
        },
        {
          question: "Does Kabanalouer charge service fees?",
          answer: "No. You contact the owner directly, with no service fees or commission.",
        },
      ]
    : [
        {
          question: "Comment trouver un chalet qui accepte les chiens au Québec ?",
          answer: `Tous les chalets de cette page acceptent les chiens${count > 0 ? ` (${count} ${plural(count, "chalet", "chalets")} en ce moment)` : ""}. Le propriétaire indique sur chaque fiche le nombre maximum de chiens, les restrictions de poids et les frais éventuels. Vous pouvez aussi activer le filtre « Chiens acceptés » dans la recherche.`,
        },
        {
          question: "Y a-t-il des frais supplémentaires pour un chien ?",
          answer: count > 0
            ? `Ça dépend du chalet. En ce moment, ${freeCount} ${plural(freeCount, "chalet", "chalets")} sur ${count} ${plural(freeCount, "n'exige", "n'exigent")} aucuns frais supplémentaires pour les chiens. Les frais éventuels sont indiqués sur la fiche, par nuit ou par séjour.`
            : "Ça dépend du chalet. Chaque propriétaire indique si les chiens sont acceptés gratuitement ou moyennant des frais par nuit ou par séjour.",
        },
        {
          question: "Les gros chiens sont-ils acceptés ?",
          answer: count > 0
            ? `En ce moment, ${allSizesCount} ${plural(allSizesCount, "chalet", "chalets")} sur ${count} ${plural(allSizesCount, "accueille", "accueillent")} les chiens de toutes tailles. Certains chalets se limitent aux petits chiens (25 lbs et moins) ou aux chiens moyens (50 lbs et moins) ; la restriction est indiquée sur chaque fiche.`
            : "Certains chalets accueillent les chiens de toutes tailles, d'autres se limitent aux petits chiens (25 lbs et moins) ou aux chiens moyens (50 lbs et moins). La restriction est indiquée sur chaque fiche.",
        },
        {
          question: "Combien de chiens puis-je amener ?",
          answer: `Chaque propriétaire fixe un maximum, de 1 à 5 chiens${maxDogs > 1 ? ` (jusqu'à ${maxDogs} parmi les chalets affichés en ce moment)` : ""}. Indiquez votre nombre de chiens dans la recherche pour ne voir que les chalets qui peuvent tous les accueillir.`,
        },
        {
          question: "Est-ce que Kabanalouer charge des frais de service ?",
          answer: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
        },
      ];

  const tips: { title: string; body: string }[] = isEn
    ? [
        { title: "Check the dog policy", body: "Look at the maximum number of dogs and the weight limit on the listing before contacting the owner." },
        { title: "Plan for the fees", body: "Some cabins are free for dogs, others charge a fee per night or per stay. The amount is shown on each listing." },
        { title: "Tell the owner about your dog", body: "Mention your dog's size and breed in your message: it speeds up the answer and avoids surprises on arrival." },
        { title: "Pack for your dog", body: "Bring a bed or blanket, bowls, a leash and bags. Keeping furniture covered helps you leave the cabin as you found it." },
      ]
    : [
        { title: "Vérifiez les conditions", body: "Regardez le nombre maximum de chiens et la restriction de poids sur la fiche avant de contacter le propriétaire." },
        { title: "Prévoyez les frais", body: "Certains chalets accueillent les chiens gratuitement, d'autres demandent des frais par nuit ou par séjour. Le montant est indiqué sur chaque fiche." },
        { title: "Présentez votre chien au proprio", body: "Précisez la taille et la race de votre chien dans votre message : la réponse est plus rapide et il n'y a pas de surprise à l'arrivée." },
        { title: "Préparez son bagage", body: "Apportez un coussin ou une couverture, ses bols, une laisse et des sacs. Couvrir les meubles aide à laisser le chalet comme vous l'avez trouvé." },
      ];

  // JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isEn ? "Home" : "Accueil", item: `${SITE_URL}${isEn ? "/en" : "/"}` },
      { "@type": "ListItem", position: 2, name: isEn ? "Cabins" : "Chalets", item: `${SITE_URL}${localePath("/chalets", locale)}` },
      { "@type": "ListItem", position: 3, name: isEn ? "Dog-friendly cabins" : "Chalets avec chien", item: `${SITE_URL}${pagePath}` },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isEn ? "Dog-friendly cabins for rent in Quebec" : "Chalets à louer où les chiens sont acceptés au Québec",
    numberOfItems: count,
    itemListElement: listings.map((l, i) => {
      const summary = dogPolicyShortSummary(l.dogPolicy, locale);
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
            addressLocality: l.city ?? l.region,
            addressRegion: l.region,
            addressCountry: "CA",
          },
          petsAllowed: true,
          ...(summary ? { description: isEn ? `Dogs allowed: ${summary}` : `Chiens acceptés : ${summary}` } : {}),
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

      {/* ── Hero ── */}
      <section className="bg-charcoal-50 border-b border-charcoal-100 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <nav className="text-sm text-charcoal-400 mb-4 flex items-center justify-center gap-1.5 flex-wrap">
            <Link href={localePath("/chalets", locale)} className="hover:text-primary hover:underline transition-colors">
              {isEn ? "Cabins" : "Chalets"}
            </Link>
            <span>›</span>
            <span className="text-charcoal-600">{isEn ? "Dog-friendly" : "Chiens acceptés"}</span>
          </nav>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <PawIcon className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal-900 mb-3">
            {isEn ? "Dog-friendly cabin rentals in Quebec" : "Location de chalet avec chien au Québec"}
          </h1>
          <p className="text-base text-charcoal-500 mb-8">
            {isEn
              ? "Cabins where your dog is welcome, everywhere in Quebec. Every listing shows the maximum number of dogs, weight limits and fees. Direct contact with owners, no service fees."
              : "Des chalets où votre chien est le bienvenu, partout au Québec. Chaque fiche indique le nombre maximum de chiens, les restrictions de poids et les frais. Contact direct avec les propriétaires, aucuns frais de service."}
          </p>
          <div className="flex justify-center">
            <SearchBar initialPets={1} />
          </div>
        </div>
      </section>

      {/* ── Listings ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <h2 className="text-heading-2 font-bold text-charcoal-900">
          {isEn
            ? `${count} dog-friendly ${plural(count, "cabin", "cabins")}`
            : `${count} ${plural(count, "chalet qui accepte", "chalets qui acceptent")} les chiens`}
        </h2>
        <p className="text-charcoal-500 mt-1 mb-8 text-sm">
          {isEn ? "Direct contact · No service fees" : "Contact direct · Aucuns frais de service"}
        </p>

        {count === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-charcoal-800 mb-1">
              {isEn ? "No dog-friendly cabins yet" : "Aucun chalet n'accepte les chiens pour le moment"}
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
              const summary = dogPolicyShortSummary(listing.dogPolicy, locale);
              return (
                <div key={listing.id}>
                  <ListingCard listing={listing} currentUserId={user?.id ?? null} />
                  {summary && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-600">
                      <PawIcon className="w-4 h-4 text-primary shrink-0" />
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
            {isEn ? "Dog-friendly cabins by region" : "Chalets avec chien par région"}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-heading-2 font-bold text-charcoal-800 mb-8">
            {isEn ? "Before renting a cabin with your dog" : "Avant de louer un chalet avec votre chien"}
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

      <Footer />
    </div>
  );
}
