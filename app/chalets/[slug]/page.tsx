import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// cookies() is used via createClient() → force dynamic to avoid DYNAMIC_SERVER_USAGE in production
export const dynamic = "force-dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/chalets/ContactForm";
import AvailabilityView from "@/components/chalets/AvailabilityView";
import ListingMap from "@/components/chalets/ListingMap";
import ExpandableText from "@/components/chalets/ExpandableText";
import RoomsCarousel from "@/components/chalets/RoomsCarousel";
import PhotoGallery from "@/components/chalets/PhotoGallery";
import AmenitiesSection from "@/components/chalets/AmenitiesSection";
import HostCard from "@/components/chalets/HostCard";
import FavoriteButton from "@/components/chalets/FavoriteButton";
import ShareButton from "@/components/chalets/ShareButton";
import ReviewForm from "@/components/chalets/ReviewForm";
import { normalizePhotos } from "@/lib/photo";
import { getRegionBySlug, getRegionSlugs } from "@/lib/regions";
import { safeJsonLd } from "@/lib/jsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { getRegionContent } from "@/lib/regionsContent";
import { formatPromoLines, isLastminuteVisible, type PromoDisplay } from "@/lib/promoLabel";
import RegionLanding from "./RegionLanding";
import ViewTracker from "@/components/chalets/ViewTracker";
import { getTranslations, getLocale } from "next-intl/server";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; capacity?: string }>;
}

export async function generateStaticParams() {
  return getRegionSlugs().map((s) => ({ slug: s }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";

  // Region landing page
  const region = getRegionBySlug(slug);
  if (region) {
    const rc = getRegionContent(slug);
    const title = isEn
      ? (rc?.meta_title_en ?? `Cabin Rentals ${rc?.locative_en ?? `in ${region.name}`}, Quebec`)
      : (rc?.meta_title_fr ?? `Chalets à louer ${region.locative}`);
    const description = isEn
      ? (rc?.meta_description_en ?? `Find cabin rentals ${rc?.locative_en ?? `in ${region.name}`}, Quebec. Direct contact with local owners. No service fees.`)
      : (rc?.meta_description_fr ?? `Découvrez nos chalets à louer ${region.locative}, Québec. Contact direct avec les propriétaires, aucun frais de service.`);
    return {
      title,
      description,
      alternates: {
        canonical: `/chalets/${slug}`,
        languages: { fr: `/chalets/${slug}`, en: `/en/chalets/${slug}`, "x-default": `/chalets/${slug}` },
      },
      openGraph: {
        title,
        description,
        url: isEn ? `/en/chalets/${slug}` : `/chalets/${slug}`,
        images: [{ url: region.heroImage, width: 1920, height: 1080, alt: isEn ? `Cabin rental ${rc?.locative_en ?? `in ${region.name}`}` : `Chalet ${region.locative}` }],
      },
      twitter: { title, description, images: [region.heroImage] },
    };
  }

  const supabase = await createClient();

  // Try by slug first, then fall back to UUID
  const { data: bySlug } = await supabase
    .from("listings")
    .select("title, title_en, region, city, description, description_en, photos, slug_fr, slug_en")
    .or(`slug_fr.eq.${slug},slug_en.eq.${slug}`)
    .eq("is_published", true)
    .maybeSingle();

  const data = bySlug ?? (await supabase
    .from("listings")
    .select("title, title_en, region, city, description, description_en, photos, slug_fr, slug_en")
    .eq("id", slug)
    .eq("is_published", true)
    .maybeSingle()).data;

  if (!data) return {};

  type MetaListing = { title: string; title_en?: string | null; region: string; city?: string | null; description?: string | null; description_en?: string | null; photos: unknown; slug_fr?: string | null; slug_en?: string | null };
  const d = data as MetaListing;

  const rawTitle = (isEn && d.title_en) ? d.title_en : d.title;
  const rawDesc = (isEn && d.description_en) ? d.description_en : d.description;

  const location = [d.city, d.region].filter(Boolean).join(", ");
  const title = location ? `${rawTitle} | ${location}` : rawTitle;
  const description = (rawDesc as string | null)?.slice(0, 160) ?? "";
  const photos = normalizePhotos(d.photos);
  const ogImage = photos[0]?.url ?? DEFAULT_PHOTO;

  const canonicalSlug = (isEn ? d.slug_en : d.slug_fr) ?? d.slug_fr ?? slug;

  return {
    title,
    description,
    alternates: {
      canonical: `/chalets/${canonicalSlug}`,
      languages: {
        fr: `/chalets/${d.slug_fr ?? slug}`,
        en: d.slug_en ? `/en/cabins/${d.slug_en}` : `/en/chalets/${slug}`,
        "x-default": `/chalets/${d.slug_fr ?? slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: isEn ? `/en/chalets/${canonicalSlug}` : `/chalets/${canonicalSlug}`,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: rawTitle }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ListingOrRegionPage({ params, searchParams }: Props) {
  const { slug } = await params;

  // Region landing page — check before any DB query
  const regionConfig = getRegionBySlug(slug);
  if (regionConfig) return <RegionLanding regionConfig={regionConfig} />;

  const [t, locale] = await Promise.all([getTranslations("listing"), getLocale()]);
  const isEn = locale === "en";

  const { checkin: urlCheckin, checkout: urlCheckout, capacity: urlCapacity } = await searchParams;
  const supabase = await createClient();

  // Try slug-based lookup first, then fall back to UUID (backward compat)
  const [{ data: listingBySlug }, { data: { user } }] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .or(`slug_fr.eq.${slug},slug_en.eq.${slug}`)
      .eq("is_published", true)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  let listing = listingBySlug;

  if (!listing) {
    const { data: byId } = await supabase
      .from("listings")
      .select("*")
      .eq("id", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (byId) {
      // Redirect to canonical slug URL if available
      type ByIdListing = { slug_fr?: string | null; slug_en?: string | null };
      const l = byId as ByIdListing;
      const targetSlug = (isEn ? (l.slug_en ?? l.slug_fr) : l.slug_fr);
      if (targetSlug) {
        permanentRedirect(`${isEn ? "/en" : ""}/chalets/${targetSlug}`);
      }
      listing = byId;
    }
  }

  if (!listing) notFound();

  const id = listing.id as string; // UUID for all sub-queries

  // Fetch host profile directly from public.users (avoids Supabase join ambiguity)
  const { data: hostProfile } = await supabase
    .from("users")
    .select("id, name, avatar_url, created_at, bio")
    .eq("id", listing.host_id as string)
    .single();

  // Increment view count (fire and forget — don't block page render)
  void supabase.rpc("increment_listing_views", { p_listing_id: id });

  // User profile for pre-filling the contact form
  const { data: userProfile } = user
    ? await supabase.from("users").select("name, phone").eq("id", user.id).single()
    : { data: null };
  const profileName = (userProfile as { name?: string; phone?: string } | null)?.name ?? "";
  const profilePhone = (userProfile as { name?: string; phone?: string } | null)?.phone ?? "";
  const [profileFirstName, ...rest] = profileName.split(" ");
  const profileLastName = rest.join(" ");

  const { data: availability } = await supabase
    .from("availability")
    .select("date, source")
    .eq("listing_id", id)
    .eq("is_blocked", true)
    .order("date", { ascending: true });

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order");

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, host_reply, created_at, author:author_id(name, avatar_url)")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  // Eligibility: check if current user has messaged this listing's host and hasn't reviewed yet
  let canReview = false;
  let hasMessaged = false;
  if (user && user.id !== (listing.host_id as string)) {
    const [msgRes, reviewRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", id)
        .eq("sender_id", user.id),
      supabase
        .from("reviews")
        .select("id")
        .eq("listing_id", id)
        .eq("author_id", user.id)
        .maybeSingle(),
    ]);
    hasMessaged = (msgRes.count ?? 0) > 0;
    canReview = hasMessaged && !reviewRes.data;
  }

  const rawPhotos = normalizePhotos(listing.photos);
  const photos = rawPhotos.length > 0 ? rawPhotos : [{ url: DEFAULT_PHOTO, caption: "" }];

  const amenities: string[] = Array.isArray(listing.amenities) ? listing.amenities : [];
  const nearbyActivities: string[] = Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [];

  // Locale-aware title and description
  const displayTitle = (isEn && (listing as { title_en?: string | null }).title_en)
    ? (listing as { title_en: string }).title_en
    : (listing.title as string);
  const displayDescription = (isEn && (listing as { description_en?: string | null }).description_en)
    ? (listing as { description_en: string }).description_en
    : (listing.description as string | null);

  // Nearby category labels mapped to translated keys
  const NEARBY_CATEGORY_LABELS: Record<string, string> = {
    "Été": t("nearbySummer"),
    "Hiver": t("nearbyWinter"),
    "4 saisons": t("nearbyAllSeason"),
  };

  const NEARBY_CATEGORIES: Record<string, string[]> = {
    "Été": [
      "Glissades d'eau / Parc aquatique", "Vélo de montagne", "Piste cyclable",
      "Randonnée pédestre", "Pêche", "Accès à un lac",
      "Accès à un lac avec embarcation à moteur", "Plage", "Parcours arbre-en-arbre",
      "Tyrolienne", "Paintball", "Go Kart", "Cinéparc", "Équitation",
      "Golf", "Escalade", "Croisière / Excursion nautique",
    ],
    "Hiver": [
      "Ski alpin", "Motoneige", "Traîneau à chiens", "Sentiers de raquettes",
      "Ski de fond", "Pêche sur glace", "Glissade sur tube", "Équitation",
      "Patinage / Hockey extérieur", "Fatbike",
    ],
    "4 saisons": [
      "Cabane à sucre", "Magasinage (shopping)", "Musée", "Restaurant / Bistro",
      "Microbrasserie", "Spa nordique", "Casino", "Cinéma", "Village touristique",
    ],
  };
  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  // AI review summary (server-side, only if 5+ reviews)
  let aiSummary: string | null = null;
  if (reviews && reviews.length >= 5 && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 250,
        system: [{ type: "text", text: "Tu es un assistant qui résume des avis de voyageurs sur des chalets québécois. Style : chaleureux, synthétique, 2-3 phrases max.", cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Résume ces ${reviews.length} avis :\n${reviews.map((r) => `"${r.comment}" (${r.rating}/5)`).join("\n")}` }],
      });
      aiSummary = msg.content[0].type === "text" ? msg.content[0].text : null;
    } catch { /* silently fail */ }
  }

  const host = hostProfile as { id: string; name: string; avatar_url: string; created_at: string; bio?: string | null } | null;

  // Host stats (for HostCard)
  let hostReviewCount = 0;
  let hostAvgRating = 0;
  let hostResponseRate: number | null = null;
  let hostAvgResponseMs: number | null = null;

  if (host) {
    const { data: hostListings } = await supabase
      .from("listings")
      .select("id")
      .eq("host_id", host.id);

    const hostListingIds = (hostListings ?? []).map((l: { id: string }) => l.id);

    const [hostReviewsResult, hostMessagesResult] = await Promise.all([
      hostListingIds.length > 0
        ? supabase.from("reviews").select("rating").in("listing_id", hostListingIds)
        : Promise.resolve({ data: [] as { rating: number }[] }),
      supabase
        .from("messages")
        .select("sender_id, receiver_id, created_at")
        .or(`receiver_id.eq.${host.id},sender_id.eq.${host.id}`)
        .order("created_at"),
    ]);

    hostReviewCount = (hostReviewsResult.data ?? []).length;
    hostAvgRating =
      hostReviewCount > 0
        ? (hostReviewsResult.data ?? []).reduce((s: number, r: { rating: number }) => s + r.rating, 0) / hostReviewCount
        : 0;

    const stats = calcHostResponseStats(hostMessagesResult.data ?? [], host.id);
    hostResponseRate = stats.responseRate;
    hostAvgResponseMs = stats.avgResponseMs;
  }

  // Favorite + active promo in parallel
  const today = new Date().toISOString().split("T")[0];
  const [{ data: favData }, { data: activePromoData }] = await Promise.all([
    user
      ? supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("promotions")
      .select("type, value, min_nights, days_before, start_date, end_date")
      .eq("listing_id", id)
      .eq("is_active", true)
      .or(`type.eq.lastminute,and(start_date.lte.${today},end_date.gte.${today})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const isFavorited = !!favData;
  const activePromo = activePromoData as PromoDisplay | null;

  // Subtitle calculations
  const city = (listing.city as string | null) ?? (() => {
    const addr = listing.address as string | null;
    if (!addr) return null;
    const parts = addr.split(",");
    return parts.length >= 2 ? parts[parts.length - 1].trim() : null;
  })();

  const allRooms = rooms ?? [];
  const bedroomsFromRooms = allRooms.filter((r) => r.type === "bedroom");
  const bedroomCount = bedroomsFromRooms.length > 0 ? bedroomsFromRooms.length : listing.bedrooms;

  const totalBeds = (() => {
    if (allRooms.length === 0) return null;
    const bedroomBeds = bedroomsFromRooms.reduce((sum, room) => {
      const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
      return sum + beds.filter((b) => b.type !== "sofa_bed").reduce((s, b) => s + b.quantity, 0);
    }, 0);
    const sofaBeds = allRooms.filter((r) => r.type === "living_room").reduce((sum, room) => {
      const beds = Array.isArray(room.beds) ? room.beds as { type: string; quantity: number }[] : [];
      return sum + beds.filter((b) => b.type === "sofa_bed").reduce((s, b) => s + b.quantity, 0);
    }, 0);
    const total = bedroomBeds + sofaBeds;
    return total > 0 ? total : null;
  })();

  const isOwner = !!(user && host && user.id === host.id);

  const lodgingJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: (listing.description as string | null) ?? "",
    image: photos.map((p) => p.url),
    url: `${SITE_URL}/chalets/${id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: city ?? listing.region,
      addressRegion: listing.region,
      addressCountry: "CA",
    },
    ...(listing.latitude && listing.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: listing.latitude, longitude: listing.longitude } }
      : {}),
    ...(listing.checkin_time ? { checkinTime: listing.checkin_time } : {}),
    ...(listing.checkout_time ? { checkoutTime: listing.checkout_time } : {}),
    ...(listing.price_on_request === false && listing.price_low > 0
      ? {
          priceRange:
            listing.price_high > listing.price_low
              ? `$${listing.price_low} - $${listing.price_high} CAD`
              : `$${listing.price_low}+ CAD`,
          // priceRange (ci-dessus) est du texte libre pour l'affichage — makesOffer/priceSpecification
          // donne en plus un prix structuré que Google peut lire de façon fiable. Le formulaire proprio
          // ne permet de saisir qu'un seul prix ("à partir de") — price_high reste à 0 tant que cette
          // fonctionnalité n'existe pas côté UI. On ne déclare donc que minPrice dans ce cas : schema.org
          // définit minPrice/maxPrice comme des bornes indépendantes ("the lowest/highest price if the
          // price is a range"), donc omettre maxPrice communique fidèlement "à partir de X$, prix final
          // confirmé avec le proprio" — plutôt que d'affirmer à tort un plafond qui n'existe pas.
          makesOffer: {
            "@type": "Offer",
            priceCurrency: "CAD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              minPrice: listing.price_low,
              ...(listing.price_high > listing.price_low ? { maxPrice: listing.price_high } : {}),
              priceCurrency: "CAD",
              unitText: "nuit",
            },
          },
        }
      : {}),
    // Sur demande (price_on_request === true) : aucun prix envoyé, volontairement — ne jamais
    // afficher de prix inventé ou approximatif dans les données structurées (règle Google).
    amenityFeature: amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    numberOfRooms: bedroomCount,
    occupancy: { "@type": "QuantitativeValue", maxValue: listing.capacity, unitText: "personnes" },
    ...(reviews && reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const subtitleParts = [
    city ? `${city}, ${listing.region}` : listing.region,
    t("personCount", { count: listing.capacity as number }),
    t("bedroomCount", { count: bedroomCount as number }),
    totalBeds !== null && totalBeds > 0 ? t("bedCount", { count: totalBeds }) : null,
    t("bathroomCount", { count: listing.bathrooms as number }),
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen">
      <ViewTracker listingId={id} isOwner={isOwner} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(lodgingJsonLd) }}
      />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ── Breadcrumb ── */}
        <nav className="hidden md:block text-sm text-charcoal-400 mb-4">
          <Link href={isEn ? "/en/chalets" : "/chalets"} className="hover:text-primary transition-colors">{t("breadcrumbCabins")}</Link>
          <span className="mx-2">›</span>
          <Link href={`${isEn ? "/en" : ""}/chalets?region=${listing.region}`} className="hover:text-primary transition-colors">{listing.region}</Link>
          <span className="mx-2">›</span>
          <span className="text-charcoal-600 truncate">{displayTitle}</span>
        </nav>

        {/* ── Title + subtitle ── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800 leading-tight mb-2">
              {displayTitle}
            </h1>
            <p className="text-sm text-charcoal-400">
              {subtitleParts.join(" · ")}
            </p>
          </div>
          <div className="hidden md:flex shrink-0 mt-1 items-center gap-2">
            <ShareButton />
            <FavoriteButton
              listingId={listing.id}
              initialIsFavorite={isFavorited}
              currentUserId={user?.id ?? null}
              className="border border-[#ebebeb]"
            />
          </div>
        </div>

        {/* ── Photo gallery ── */}
        <PhotoGallery photos={photos} title={listing.title} />

        {/* ── Two-column layout ── */}
        <div className="flex gap-10 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Amenities — Caractéristiques du chalet */}
            {amenities.length > 0 && <AmenitiesSection amenities={amenities} />}

            <hr className="border-[#ebebeb]" />

            {/* Description */}
            {displayDescription && (
              <div>
                <h2 className="font-semibold text-charcoal-800 mb-3">{t("descriptionTitle")}</h2>
                <ExpandableText text={displayDescription} />
              </div>
            )}

            {/* Rooms */}
            {rooms && rooms.length > 0 && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="font-semibold text-charcoal-800 mb-4">{t("roomsTitle")}</h2>
                  <RoomsCarousel
                    rooms={rooms.map((r) => ({
                      id: r.id,
                      type: r.type,
                      name: r.name,
                      capacity: r.capacity,
                      beds: Array.isArray(r.beds) ? r.beds as { type: string; quantity: number }[] : [],
                      photos: Array.isArray(r.photos) ? r.photos as string[] : [],
                    }))}
                  />
                </div>
              </>
            )}

            {/* Availability */}
            <hr className="border-[#ebebeb]" />
            <div>
              <h2 className="font-semibold text-charcoal-800 mb-4">{t("availabilityTitle")}</h2>
              <AvailabilityView
                blocked={(availability ?? []) as { date: string; source: "manual" | "ical" }[]}
              />
            </div>

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="font-semibold text-charcoal-800 mb-4">{t("mapTitle")}</h2>
                  <ListingMap lat={listing.latitude as number} lng={listing.longitude as number} />
                </div>
              </>
            )}

            {/* Nearby activities */}
            {nearbyActivities.length > 0 && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="font-semibold text-charcoal-800 mb-1">{t("nearbyTitle")}</h2>
                  <p className="text-sm text-charcoal-400 mb-4">{t("nearbySubtitle")}</p>
                  <div className="space-y-5">
                    {Object.entries(NEARBY_CATEGORIES).map(([cat, items]) => {
                      const catItems = items.filter((i) => nearbyActivities.includes(i));
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-2">{NEARBY_CATEGORY_LABELS[cat] ?? cat}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {catItems.map((a) => (
                              <div key={a} className="flex items-center gap-2 text-sm text-charcoal-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {a}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Reviews */}
            <hr className="border-[#ebebeb]" />
            <div>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="font-semibold text-charcoal-800">
                  {t("reviewsTitle")} {reviews && reviews.length > 0 && `(${reviews.length})`}
                </h2>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-sm">{avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* AI summary */}
              {aiSummary && (
                <div className="bg-ai-light rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-ai bg-white px-2.5 py-1 rounded-full">
                      {t("aiSummaryBadge")}
                    </span>
                    <span className="text-xs text-ai/60">{t("aiSummarySub", { count: reviews!.length })}</span>
                  </div>
                  <p className="text-sm text-charcoal-700 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {reviews && reviews.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {reviews.map((review) => {
                    type AuthorShape = { name: string | null; avatar_url: string | null } | null;
                    const author = review.author as unknown as AuthorShape;
                    const authorName = author?.name ?? "Voyageur";
                    const authorFirst = authorName.split(" ")[0];
                    const initial = authorFirst[0]?.toUpperCase() ?? "V";
                    const reviewDate = new Date(review.created_at).toLocaleDateString("fr-CA", {
                      month: "long", year: "numeric",
                    });
                    const hostReply = review.host_reply as string | null;
                    return (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full shrink-0 bg-primary overflow-hidden flex items-center justify-center">
                            {author?.avatar_url ? (
                              <img src={author.avatar_url} alt={authorFirst} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-sm">{initial}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-charcoal-800 leading-tight">{authorFirst}</p>
                            <p className="text-xs text-charcoal-400 mb-1">{reviewDate}</p>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <svg key={i} className={`w-3 h-3 fill-current ${i <= review.rating ? "text-primary" : "text-[#ebebeb]"}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-charcoal-500 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                        {hostReply && (
                          <div className="pl-4 border-l-2 border-[#ebebeb] mt-2">
                            <p className="text-xs font-semibold text-charcoal-600 mb-1">{t("hostReplyLabel")}</p>
                            <p className="text-sm text-charcoal-500 leading-relaxed">{hostReply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-charcoal-400 text-sm">{t("noReviews")}</p>
              )}

              {/* Review form — visible if eligible */}
              {canReview && <ReviewForm listingId={listing.id} />}
              {user && !isOwner && !canReview && !hasMessaged && (
                <p className="text-sm text-charcoal-400 mt-6 px-4 py-3 bg-charcoal-50 rounded-xl">
                  {t("contactMeToReview")}
                </p>
              )}
            </div>

            {/* Practical info */}
            <>
              <hr className="border-[#ebebeb]" />
              <div>
                <h2 className="font-semibold text-charcoal-800 mb-4">{t("practicalInfo")}</h2>
                <div className="space-y-2.5 text-sm text-charcoal-700">
                  {listing.checkin_time && (
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>
                      <span>{t("checkinFrom", { time: (listing.checkin_time as string).replace(":", "h") })}</span>
                    </div>
                  )}
                  {listing.checkout_time && (
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>
                      <span>{t("checkoutBefore", { time: (listing.checkout_time as string).replace(":", "h") })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    <span>
                      {listing.checkin_type === "in_person"
                        ? t("checkinInPerson")
                        : t("checkinAutonomous")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span>{listing.pets_allowed ? t("petsAllowed") : t("petsNotAllowed")}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span>{listing.smoking_allowed ? t("smokingAllowed") : t("smokingNotAllowed")}</span>
                  </div>
                  {listing.min_age && (listing.min_age as number) > 0 && (
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <span>{t("minAge", { age: listing.min_age as number })}</span>
                    </div>
                  )}
                  {listing.citq_number && (
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      <span>{t("citqNumber", { number: listing.citq_number as string })}</span>
                    </div>
                  )}
                </div>
              </div>
            </>

            {/* Host section */}
            {host && (
              <>
                <hr className="border-[#ebebeb]" />
                <HostCard
                  host={host}
                  reviewCount={hostReviewCount}
                  avgRating={hostAvgRating}
                  responseRate={hostResponseRate}
                  avgResponseMs={hostAvgResponseMs}
                  listingId={listing.id}
                  listingTitle={listing.title}
                  currentUserId={user?.id ?? null}
                  isOwner={isOwner}
                />
              </>
            )}
          </div>

          {/* ── Right column — Pricing card ── */}
          <div className="w-80 shrink-0 sticky top-24 hidden lg:block">
            <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-lg p-6">
              {/* Promo bandeau */}
              {activePromo && isLastminuteVisible(activePromo, urlCheckin) && (() => {
                const lines = formatPromoLines(activePromo);
                return (
                  <div className="mb-4 flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-primary leading-snug">{lines.line1}</p>
                      {lines.line2 && <p className="text-xs font-normal text-primary/80 leading-snug mt-0.5">{lines.line2}</p>}
                    </div>
                  </div>
                );
              })()}
              {/* CTA */}
              {isOwner ? (
                <button disabled className="w-full py-3 rounded-full bg-charcoal-50 text-charcoal-300 font-medium text-sm cursor-not-allowed">
                  {t("isYourCabin")}
                </button>
              ) : (
                <>
                  <ContactForm
                    listingId={listing.id}
                    hostId={host?.id ?? ""}
                    hostName={host?.name ?? "le propriétaire"}
                    hostAvatarUrl={host?.avatar_url ?? null}
                    hostCreatedAt={host?.created_at ?? null}
                    listingTitle={listing.title}
                    currentUserId={user?.id ?? null}
                    initialCheckin={urlCheckin}
                    initialCheckout={urlCheckout}
                    initialAdults={parseInt(urlCapacity ?? "0") || 0}
                    price={listing.price_low as number | null}
                    priceOnRequest={!!(listing.price_on_request)}
                  />
                  <p className="text-xs text-charcoal-400 text-center mt-3">
                    {t("contactDirect")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        {!isOwner && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#ebebeb] px-4 py-3 z-40 flex items-center justify-between gap-4">
            {listing.price_on_request || listing.price_low === 0 ? (
              <span className="text-sm font-bold text-charcoal-800">{t("priceOnRequest")}</span>
            ) : (
              <div>
                {activePromo && isLastminuteVisible(activePromo, urlCheckin) && (
                  <p className="text-[11px] font-medium text-primary leading-none mb-1 truncate max-w-[160px]">
                    {formatPromoLines(activePromo).line1}
                  </p>
                )}
                <span className="text-lg font-bold text-charcoal-800">{listing.price_low} $</span>
                <span className="text-xs text-charcoal-400"> {t("perNight")}</span>
              </div>
            )}
            {user ? (
              <a
                href="#contact-form"
                className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                {t("mobileContactCta")}
              </a>
            ) : (
              <a
                href={`${isEn ? "/en" : ""}/login?next=${isEn ? "/en" : ""}/chalets/${listing.id}`}
                className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                {t("mobileContactCta")}
              </a>
            )}
          </div>
        )}
      </main>

      <div className="lg:hidden h-24" />
      <Footer />
    </div>
  );
}

function calcHostResponseStats(
  messages: { sender_id: string; receiver_id: string; created_at: string }[],
  hostId: string
) {
  const convs = new Map<string, { firstMsg: Date; firstReply: Date | null }>();
  for (const msg of messages) {
    const incoming = msg.receiver_id === hostId;
    const partner = incoming ? msg.sender_id : msg.receiver_id;
    if (!convs.has(partner)) convs.set(partner, { firstMsg: new Date(0), firstReply: null });
    const c = convs.get(partner)!;
    if (incoming && c.firstMsg.getTime() === 0) c.firstMsg = new Date(msg.created_at);
    else if (!incoming && c.firstReply === null && c.firstMsg.getTime() > 0)
      c.firstReply = new Date(msg.created_at);
  }
  let replied = 0, totalMs = 0, replyN = 0;
  for (const c of convs.values()) {
    if (c.firstReply) {
      replied++;
      const ms = c.firstReply.getTime() - c.firstMsg.getTime();
      if (ms > 0) { totalMs += ms; replyN++; }
    }
  }
  return {
    responseRate: convs.size > 0 ? Math.round((replied / convs.size) * 100) : null,
    avgResponseMs: replyN > 0 ? totalMs / replyN : null,
  };
}

