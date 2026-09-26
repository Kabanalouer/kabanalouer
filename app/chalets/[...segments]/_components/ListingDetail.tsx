import Link from "next/link";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import ContactForm from "@/components/chalets/ContactForm";
import MobileContactTrigger from "@/components/chalets/MobileContactTrigger";
import AvailabilityView from "@/components/chalets/AvailabilityView";
import ListingMap from "@/components/chalets/ListingMap";
import ExpandableText from "@/components/chalets/ExpandableText";
import RoomsCarousel from "@/components/chalets/RoomsCarousel";
import PhotoGallery from "@/components/chalets/PhotoGallery";
import AmenitiesSection from "@/components/chalets/AmenitiesSection";
import ListingHighlights from "@/components/chalets/ListingHighlights";
import HostCard from "@/components/chalets/HostCard";
import FavoriteButton from "@/components/chalets/FavoriteButton";
import ShareButton from "@/components/chalets/ShareButton";
import ReviewsList from "@/components/chalets/ReviewsList";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { normalizePhotos } from "@/lib/photo";
import { safeJsonLd } from "@/lib/jsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { buildListingPath } from "@/lib/listingUrl";
import { localePath } from "@/lib/localePath";
import { getRegionByDbValue } from "@/lib/regions";
import { slugify } from "@/lib/slugify";
import { formatPromoLines, isLastminuteVisible, type PromoDisplay } from "@/lib/promoLabel";
import { NEARBY_BY_CATEGORY, getNearbyLabel } from "@/lib/nearbyActivities";
import ViewTracker from "@/components/chalets/ViewTracker";
import { getTranslations } from "next-intl/server";
import type { AmenityValue } from "@/lib/amenities-catalog";
import { buildListingJsonLd, buildListingFaqJsonLd } from "@/lib/listing-schema";
import { formatDecimal } from "@/lib/formatNumber";
import { DOGS_MAX_LIMIT, dogPolicyDetails, parseDogPolicy, parseDogsParam } from "@/lib/dogPolicy";
import PawIcon from "@/components/PawIcon";
import AccessibilityIcon from "@/components/AccessibilityIcon";
import { accessibleLabel, groupAccessibilityFeatures, parseAccessibility } from "@/lib/accessibility";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

interface ListingDetailProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listing: any;
  user: { id: string } | null;
  searchParams: { checkin?: string; checkout?: string; capacity?: string; dogs?: string; preview?: string };
  locale: string;
  isPreviewFrame: boolean;
}

export default async function ListingDetail({ listing, user, searchParams, locale, isPreviewFrame }: ListingDetailProps) {
  const t = await getTranslations("listing");
  const isEn = locale === "en";

  const { checkin: urlCheckin, checkout: urlCheckout, capacity: urlCapacity } = searchParams;
  const dogPolicy = parseDogPolicy(listing);
  const dogDetails = dogPolicyDetails(dogPolicy, locale);
  const accessibility = parseAccessibility(listing);
  const accessibilityGroups = groupAccessibilityFeatures(accessibility, locale);
  const urlDogs = dogPolicy.allowed
    ? (() => { const n = parseDogsParam(searchParams.dogs); return n ? Math.min(n, dogPolicy.max ?? DOGS_MAX_LIMIT) : null; })()
    : null;
  const supabase = await createClient();

  // Si la ligne a pu être lue alors qu'elle n'est pas publiée, c'est
  // uniquement parce que la RLS a laissé passer le propriétaire ou un
  // admin — sert de signal pour le bandeau d'aperçu ci-dessous.
  const isDraftPreview = !listing.is_published;

  const id = listing.id as string; // UUID for all sub-queries
  const canonicalPath = buildListingPath(listing, isEn ? "en" : "fr") ?? `/chalets/${id}`;

  // Fil d'Ariane : Chalets > Région > Ville > Titre (voir CLAUDE.md section 9,
  // les segments région/ville pointent vers les vraies pages dédiées déjà
  // existantes, jamais une URL de recherche filtrée comme avant).
  const regionConfig = listing.region ? getRegionByDbValue(listing.region as string) : undefined;
  const regionBasePath = regionConfig
    ? (isEn ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`)
    : undefined;
  const cityBasePath = regionBasePath && listing.city
    ? `${regionBasePath}/${slugify(listing.city as string)}`
    : undefined;
  const regionDisplayName = regionConfig ? (isEn ? regionConfig.nameEn : regionConfig.name) : "";

  // Fetch host profile via public_profiles (vue publique, colonnes non sensibles
  // uniquement — voir supabase/create-public-profiles-view.sql) plutôt que
  // public.users directement, dont la RLS ne permet plus la lecture publique.
  let { data: hostProfile } = await supabase
    .from("public_profiles")
    .select("id, name, avatar_url, created_at, bio, bio_en")
    .eq("id", listing.host_id as string)
    .single();

  if (!hostProfile) {
    // bio_en n'existe peut-être pas encore sur public_profiles (migration Tâche 7
    // en attente d'exécution manuelle par Simon) — repli sans cette colonne pour
    // ne jamais faire échouer toute la requête à cause d'elle.
    const fallback = await supabase
      .from("public_profiles")
      .select("id, name, avatar_url, created_at, bio")
      .eq("id", listing.host_id as string)
      .single();
    hostProfile = fallback.data as typeof hostProfile;
  }

  // Increment view count (fire and forget — don't block page render)
  void supabase.rpc("increment_listing_views", { p_listing_id: id });

  // User profile for pre-filling the contact form
  const { data: userProfile } = user
    ? await supabase.from("users").select("name, phone, avatar_url").eq("id", user.id).single()
    : { data: null };
  const profileName = (userProfile as { name?: string; phone?: string } | null)?.name ?? "";
  const profilePhone = (userProfile as { name?: string; phone?: string } | null)?.phone ?? "";
  // true par défaut (visiteur non connecté) : le rappel photo ne concerne que les comptes existants
  const senderHasAvatar = user ? !!(userProfile as { avatar_url?: string | null } | null)?.avatar_url : true;
  const [profileFirstName, ...rest] = profileName.split(" ");
  const profileLastName = rest.join(" ");

  const { data: availability } = await supabase
    .from("availability")
    .select("date, source")
    .eq("listing_id", id)
    .eq("is_blocked", true)
    .order("date", { ascending: true });

  // Widget dates/voyageurs de la fiche publique (ContactForm) — mêmes dates
  // bloquées que la section "Disponibilités" (AvailabilityView) plus bas,
  // une seule requête pour les deux.
  const blockedDateStrings = (availability ?? []).map((a) => a.date as string);

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order");

  // Jointure PostgREST retirée : "author:author_id(...)" suit la vraie clé
  // étrangère vers public.users, dont la RLS ne permet plus la lecture
  // publique — fetch séparé via la vue public_profiles, fusionné ici.
  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, host_reply, created_at, review_type, author_id")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  const reviewAuthorIds = [...new Set((rawReviews ?? []).map((r) => r.author_id as string))];
  const { data: reviewAuthors } = reviewAuthorIds.length > 0
    ? await supabase.from("public_profiles").select("id, name, avatar_url").in("id", reviewAuthorIds)
    : { data: [] as { id: string; name: string | null; avatar_url: string | null }[] };
  const reviewAuthorById = new Map(
    (reviewAuthors ?? []).map((a) => [a.id as string, { name: a.name as string | null, avatar_url: a.avatar_url as string | null }])
  );
  const reviews = (rawReviews ?? []).map((r) => ({
    ...r,
    author: reviewAuthorById.get(r.author_id as string) ?? null,
  }));

  const rawPhotos = normalizePhotos(listing.photos);
  const photos = rawPhotos.length > 0 ? rawPhotos : [{ url: DEFAULT_PHOTO, caption: "" }];

  const amenities: AmenityValue[] = Array.isArray(listing.amenities) ? listing.amenities : [];
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
        system: [{ type: "text", text: "Tu es un assistant qui résume des avis de voyageurs sur des chalets québécois. Style : chaleureux, synthétique, 2-3 phrases max.", cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Résume ces ${reviews.length} avis :\n${reviews.map((r) => `"${r.comment}" (${r.rating}/5)`).join("\n")}` }],
      });
      aiSummary = msg.content[0].type === "text" ? msg.content[0].text : null;
    } catch { /* silently fail */ }
  }

  const host = hostProfile as { id: string; name: string; avatar_url: string; created_at: string; bio?: string | null; bio_en?: string | null } | null;

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

  const schemaInput = {
    title: listing.title as string,
    description: (listing.description as string | null) ?? null,
    photoUrls: photos.map((p) => p.url),
    url: `${SITE_URL}${canonicalPath}`,
    city: city ?? null,
    region: (listing.region as string | null) ?? null,
    latitude: (listing.latitude as number | null) ?? null,
    longitude: (listing.longitude as number | null) ?? null,
    checkinTime: (listing.checkin_time as string | null) ?? null,
    checkoutTime: (listing.checkout_time as string | null) ?? null,
    priceOnRequest: !!listing.price_on_request,
    priceLow: (listing.price_low as number) ?? 0,
    priceHigh: (listing.price_high as number) ?? 0,
    amenities,
    locale,
    bedroomCount: bedroomCount as number,
    bathrooms: listing.bathrooms as number,
    capacity: listing.capacity as number,
    dogPolicy,
    accessibility,
    smokingAllowed: !!listing.smoking_allowed,
    citqNumber: (listing.citq_number as string | null) ?? null,
    reviewCount: reviews ? reviews.length : 0,
    avgRating,
  };
  const lodgingJsonLd = buildListingJsonLd(schemaInput);
  const faqJsonLd = buildListingFaqJsonLd(schemaInput);

  const subtitleParts = [
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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      {!isPreviewFrame && <Navbar />}

      {isDraftPreview && (
        <div className="bg-primary/10 border-b border-primary/20">
          <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-sm font-medium text-primary text-center">
            {t("draftPreviewBanner")}
          </p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ── Breadcrumb ── */}
        <nav className="hidden md:block text-sm text-charcoal-400 mb-4">
          <Link href={localePath("/chalets", locale)} className="hover:text-primary hover:underline transition-colors">{t("breadcrumbCabins")}</Link>
          {regionBasePath && (
            <>
              <span className="mx-2">›</span>
              <Link href={regionBasePath} className="hover:text-primary hover:underline transition-colors">
                {regionDisplayName}
              </Link>
            </>
          )}
          {cityBasePath && (
            <>
              <span className="mx-2">›</span>
              <Link href={cityBasePath} className="hover:text-primary hover:underline transition-colors">
                {listing.city}
              </Link>
            </>
          )}
          <span className="mx-2">›</span>
          <span className="text-charcoal-600 truncate">{displayTitle}</span>
        </nav>

        {/* ── Title + subtitle ── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800 leading-tight mb-2">
              {displayTitle}
            </h1>
            <p className="text-base text-charcoal-500">
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
            {/* Points forts — teaser, voir AmenitiesSection plus bas pour la liste complète */}
            {amenities.length > 0 && <ListingHighlights amenities={amenities} />}

            <hr className="border-[#ebebeb]" />

            {/* Description */}
            {displayDescription && (
              <div>
                <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{t("descriptionTitle")}</h2>
                <ExpandableText text={displayDescription} />
              </div>
            )}

            {/* Rooms */}
            {rooms && rooms.length > 0 && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{t("roomsTitle")}</h2>
                  <RoomsCarousel
                    rooms={rooms.map((r) => ({
                      id: r.id,
                      type: r.type,
                      name: r.name,
                      name_en: (r.name_en as string | null) ?? null,
                      capacity: r.capacity,
                      beds: Array.isArray(r.beds) ? r.beds as { type: string; quantity: number }[] : [],
                      photos: Array.isArray(r.photos) ? r.photos as string[] : [],
                    }))}
                  />
                </div>
              </>
            )}

            {/* Amenities — "Ce que propose ce chalet", juste après les chambres */}
            {amenities.length > 0 && (
              <>
                <hr className="border-[#ebebeb]" />
                <AmenitiesSection amenities={amenities} />
              </>
            )}

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{t("mapTitle")}</h2>
                  <ListingMap lat={listing.latitude as number} lng={listing.longitude as number} />
                </div>
              </>
            )}

            {/* Nearby activities */}
            {nearbyActivities.length > 0 && (
              <>
                <hr className="border-[#ebebeb]" />
                <div>
                  <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-1">{t("nearbyTitle")}</h2>
                  <p className="text-sm text-charcoal-400 mb-4">{t("nearbySubtitle")}</p>
                  <div className="space-y-5">
                    {Object.entries(NEARBY_BY_CATEGORY).map(([cat, items]) => {
                      const catItems = items.filter((i) => nearbyActivities.includes(i));
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-2">{NEARBY_CATEGORY_LABELS[cat] ?? cat}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {catItems.map((a) => (
                              <div key={a} className="flex items-center gap-2 text-base text-charcoal-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {getNearbyLabel(a, locale)}
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
                <h2 className="text-heading-2 font-semibold text-charcoal-800">
                  {t("reviewsTitle")} {reviews && reviews.length > 0 && `(${reviews.length})`}
                </h2>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-star fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-heading-2 font-semibold text-charcoal-800">{formatDecimal(avgRating, locale)}</span>
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
                  <p className="text-base text-charcoal-700 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {reviews && reviews.length > 0 ? (
                <ReviewsList reviews={reviews as unknown as Parameters<typeof ReviewsList>[0]["reviews"]} />
              ) : (
                <p className="text-charcoal-400 text-base">{t("noReviews")}</p>
              )}
            </div>

            {/* Practical info */}
            <>
              <hr className="border-[#ebebeb]" />
              <div>
                <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{t("practicalInfo")}</h2>
                <div className="space-y-3 text-base text-charcoal-700">
                  {listing.checkin_time && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>
                      <span>{t("checkinFrom", { time: (listing.checkin_time as string).replace(":", "h") })}</span>
                    </div>
                  )}
                  {listing.checkout_time && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>
                      <span>{t("checkoutBefore", { time: (listing.checkout_time as string).replace(":", "h") })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    <span>
                      {listing.checkin_type === "in_person"
                        ? t("checkinInPerson")
                        : t("checkinAutonomous")}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <PawIcon className="w-5 h-5 text-charcoal-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span>{dogPolicy.allowed ? t("dogsAllowed") : t("dogsNotAllowed")}</span>
                      {dogDetails.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-sm text-charcoal-500">
                          {dogDetails.map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                  {accessibility.accessible && (
                    <div className="flex items-start gap-3">
                      <AccessibilityIcon className="w-5 h-5 text-charcoal-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span>{accessibleLabel(locale)}</span>
                        {accessibilityGroups.map((group) => (
                          <div key={group.title} className="mt-2">
                            <p className="text-sm font-medium text-charcoal-600">{group.title}</p>
                            <ul className="mt-0.5 space-y-0.5 text-sm text-charcoal-500">
                              {group.items.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span>{listing.smoking_allowed ? t("smokingAllowed") : t("smokingNotAllowed")}</span>
                  </div>
                  {listing.min_age && (listing.min_age as number) > 0 && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <span>{t("minAge", { age: listing.min_age as number })}</span>
                    </div>
                  )}
                  {listing.citq_number && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      <span>{t("citqNumber", { number: listing.citq_number as string })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm5.13-3.87a4 4 0 010 7.75M6.87 5.13a4 4 0 000 7.75" /></svg>
                    <span>{t("capacityInfo", { count: listing.capacity as number })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                    <span>{t("bedroomsInfo", { count: bedroomCount as number })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16v2a6 6 0 01-6 6H10a6 6 0 01-6-6v-2zM4 12V6a2 2 0 012-2h1M8 20v2M16 20v2" /></svg>
                    <span>{t("bathroomsInfo", { count: listing.bathrooms as number })}</span>
                  </div>
                </div>
              </div>
            </>

            {/* Availability */}
            <hr className="border-[#ebebeb]" />
            <div>
              <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{t("availabilityTitle")}</h2>
              <AvailabilityView
                blocked={(availability ?? []) as { date: string; source: "manual" | "ical" }[]}
              />
            </div>

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
                  currentUserHasAvatar={senderHasAvatar}
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
                  <div className="mb-4 flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-accent leading-snug">{lines.line1}</p>
                      {lines.line2 && <p className="text-xs font-normal text-accent/80 leading-snug mt-0.5">{lines.line2}</p>}
                    </div>
                  </div>
                );
              })()}
              {/* CTA */}
              {isOwner ? (
                <div className="rounded-xl bg-charcoal-50 border border-[#ebebeb] p-5 text-center">
                  <p className="text-base font-semibold text-charcoal-800">{t("isYourCabin")}</p>
                  <p className="text-sm text-charcoal-500 mt-1">{t("ownListingNote")}</p>
                  <Link
                    href={localePath(`/dashboard/listings/${listing.id}/edit`, locale)}
                    className="mt-4 inline-flex items-center justify-center bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
                  >
                    {t("editListingCta")}
                  </Link>
                </div>
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
                    senderFirstName={profileFirstName}
                    senderLastName={profileLastName}
                    senderHasAvatar={senderHasAvatar}
                    initialCheckin={urlCheckin}
                    initialCheckout={urlCheckout}
                    initialAdults={urlCapacity ? (parseInt(urlCapacity) || undefined) : undefined}
                    price={listing.price_low as number | null}
                    priceOnRequest={!!(listing.price_on_request)}
                    capacity={listing.capacity as number}
                    dogsMax={dogPolicy.allowed ? (dogPolicy.max ?? DOGS_MAX_LIMIT) : 0}
                    initialPets={urlDogs ?? undefined}
                    blockedDates={blockedDateStrings}
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
                  <p className="text-xs font-medium text-accent leading-none mb-1 truncate max-w-[160px]">
                    {formatPromoLines(activePromo).line1}
                  </p>
                )}
                <span className="text-lg font-bold text-charcoal-800">{listing.price_low} $</span>
                <span className="text-xs text-charcoal-400"> {t("perNight")}</span>
              </div>
            )}
            <MobileContactTrigger
              label={t("quoteRequestCta")}
              listingId={listing.id}
              hostId={host?.id ?? ""}
              hostName={host?.name ?? "le propriétaire"}
              hostAvatarUrl={host?.avatar_url ?? null}
              hostCreatedAt={host?.created_at ?? null}
              listingTitle={listing.title}
              currentUserId={user?.id ?? null}
              senderFirstName={profileFirstName}
              senderLastName={profileLastName}
              senderHasAvatar={senderHasAvatar}
              initialCheckin={urlCheckin}
              initialCheckout={urlCheckout}
              initialAdults={urlCapacity ? (parseInt(urlCapacity) || undefined) : undefined}
              price={listing.price_low as number | null}
              priceOnRequest={!!(listing.price_on_request)}
              capacity={listing.capacity as number}
              dogsMax={dogPolicy.allowed ? (dogPolicy.max ?? DOGS_MAX_LIMIT) : 0}
                    initialPets={urlDogs ?? undefined}
              blockedDates={blockedDateStrings}
            />
          </div>
        )}
      </main>

      <div className="lg:hidden h-24" />
      {!isPreviewFrame && <Footer />}
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
