import { notFound, redirect } from "next/navigation";
import { LISTING_PRIVATE_COLUMNS, LISTING_PUBLIC_COLUMNS } from "@/lib/listingColumns";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import EditListingForm from "@/components/dashboard/EditListingForm";
import { normalizePhotos } from "@/lib/photo";
import type { BlockedEntry } from "@/components/dashboard/AvailabilityCalendar";
import { getNextPaidRank, priceForRank } from "@/lib/subscriptionPricing";
import type { AmenityValue } from "@/lib/amenities-catalog";
import { parseDogPolicy } from "@/lib/dogPolicy";
import { parseAccessibility } from "@/lib/accessibility";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "Edit cabin" : "Modifier le chalet" };
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imported?: string }>;
}

export default async function EditListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { imported } = await searchParams;
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const isEn = locale === "en";
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(localePath(`/login?next=${encodeURIComponent(localePath(`/dashboard/listings/${id}/edit`, locale))}`, locale));

  // Pas de filtre host_id ici — RLS laisse passer soit le propriétaire, soit
  // un admin (nouvelle politique "Les admins gèrent tous les listings"). Le
  // filtre par propriété reste vérifié explicitement juste en dessous : RLS
  // laisse aussi voir les annonces PUBLIÉES de n'importe qui (page publique),
  // ce qui ne doit jamais suffire à ouvrir ce formulaire d'édition.
  const [{ data: publicListing }, { data: viewerProfile }] = await Promise.all([
    supabase.from("listings").select(LISTING_PUBLIC_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  if (!publicListing) notFound();

  const isOwner = publicListing.host_id === user.id;
  const isAdmin = viewerProfile?.role === "admin";
  if (!isOwner && !isAdmin) notFound();

  // Colonnes privées (adresse, lien iCal, import) : lues avec le client service
  // seulement après la vérification ci-dessus (voir lib/listingColumns.ts)
  const { data: privateColumns } = await adminSupabase()
    .from("listings")
    .select(LISTING_PRIVATE_COLUMNS.join(", ") as "*")
    .eq("id", id)
    .single();
  const listing = { ...publicListing, ...(privateColumns ?? {}) };

  const isAdminReview = isAdmin && !isOwner;
  const hostId = listing.host_id as string;

  const admin = adminSupabase();

  const [{ data: subscription }, nextPaidRank, { data: blockedDates }] = await Promise.all([
    // Par listing_id, pas user_id — un proprio peut avoir plusieurs annonces,
    // donc plusieurs lignes subscriptions ; .maybeSingle() échouerait sinon.
    // Sert aussi à l'éligibilité de l'offre de lancement : l'existence d'une
    // ligne pour CE listing_id (peu importe son statut) suffit à prouver que
    // cette annonce précise a déjà eu un abonnement, gratuit ou payant.
    supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("listing_id", id)
      .maybeSingle(),
    getNextPaidRank(admin, hostId),
    supabase
      .from("availability")
      .select("date, source")
      .eq("listing_id", id),
  ]);

  const { cents: nextPaidPriceCents } = priceForRank(nextPaidRank);
  const dogPolicy = parseDogPolicy(listing);
  const accessibility = parseAccessibility(listing);
  const publicHref =
    buildListingPath(
      {
        region: (listing.region as string | null) ?? null,
        city: (listing.city as string | null) ?? null,
        listing_number: (listing.listing_number as number | null) ?? null,
        custom_slug: (listing.custom_slug as string | null) ?? null,
      },
      isEn ? "en" : "fr"
    ) ?? localePath(`/chalets/${id}`, locale);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold text-charcoal-900">{listing.title
            ? (isEn ? "Edit my listing" : "Modifier mon annonce")
            : (isEn ? "Create my listing" : "Créer mon annonce")}</h1>
          {/* Statut toujours visible : un brouillon (souvent importé d'Airbnb)
              ne doit jamais passer pour une annonce en ligne. */}
          {listing.is_published ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-semibold text-success-700">
              <span className="w-2 h-2 rounded-full bg-success-500" aria-hidden="true" />
              {isEn ? "Live" : "En ligne"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-800">
              <span className="w-2 h-2 rounded-full bg-warning-500" aria-hidden="true" />
              {isEn ? "Draft · not live yet" : "Brouillon · pas encore en ligne"}
            </span>
          )}
        </div>
        <p className="text-charcoal-500 text-sm mt-1 flex items-center gap-1.5">
          <span className="line-clamp-1">{(isEn && (listing.title_en as string | null)) || listing.title}</span>
          {listing.title && (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              title={isEn ? "View public listing" : "Voir la fiche publique"}
              className="shrink-0 text-charcoal-400 hover:text-charcoal-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          )}
        </p>
      </div>
      {/* Annonce importée d'Airbnb pas encore publiée : rappel affiché à chaque
          visite (pas seulement juste après l'import), sans bouton pour le fermer. */}
      {isOwner && !listing.is_published && (imported || listing.import_source) && (
        <div role="status" className="mb-6 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4">
          <p className="font-semibold text-charcoal-800">
            {imported === "duplicate"
              ? (isEn ? "You already imported this listing" : "Vous avez déjà importé cette annonce")
              : (isEn ? "Airbnb listing imported successfully!" : "Annonce Airbnb importée avec succès !")}
          </p>
          <p className="mt-1 text-sm font-semibold text-warning-800">
            {isEn ? "It is not visible to travelers yet." : "Elle n'est pas encore visible des voyageurs."}
          </p>
          <p className="mt-1 text-sm text-charcoal-600">
            {isEn
              ? "Check the information copied from Airbnb, fill in what’s missing (for example, the bedrooms and your CITQ number), then publish it with the “Publish my listing” button."
              : "Vérifiez les informations reprises d’Airbnb, complétez ce qui manque (par exemple, les chambres, votre numéro CITQ), puis publiez-la avec le bouton « Publier mon annonce »."}
          </p>
        </div>
      )}
      <EditListingForm
        userId={hostId}
        listingId={id}
        isPublished={listing.is_published ?? false}
        initialCity={listing.city ?? ""}
        initialLat={listing.latitude ?? null}
        initialLng={listing.longitude ?? null}
        subscriptionStatus={subscription?.status ?? null}
        subscriptionExpiresAt={subscription?.expires_at ?? null}
        hasExistingSubscription={!!subscription}
        nextPaidPriceCents={nextPaidPriceCents}
        initialBlocked={(blockedDates ?? []) as BlockedEntry[]}
        icalUrl={(listing.ical_url as string | null) ?? null}
        icalLastSync={(listing.ical_last_sync as string | null) ?? null}
        listingCreatedAt={(listing.created_at as string) ?? new Date().toISOString()}
        viewsListing={(listing.views_listing as number) ?? 0}
        isAdminReview={isAdminReview}
        importStatus={(listing.import_status as string | null) ?? null}
        importSourceUrl={(listing.import_source_url as string | null) ?? null}
        listingNumber={(listing.listing_number as number | null) ?? null}
        initialCustomSlug={(listing.custom_slug as string | null) ?? null}
        initialData={{
          title: listing.title ?? "",
          title_en: (listing.title_en as string | null) ?? "",
          description: listing.description ?? "",
          description_en: (listing.description_en as string | null) ?? "",
          region: listing.region ?? "",
          address: listing.address ?? "",
          capacity: listing.capacity ?? 4,
          bedrooms: listing.bedrooms ?? 2,
          bathrooms: listing.bathrooms ?? 1,
          price_low: listing.price_low ?? 0,
          price_high: listing.price_high ?? 0,
          price_peak: listing.price_peak ?? 0,
          amenities: Array.isArray(listing.amenities) ? (listing.amenities as AmenityValue[]) : [],
          photos: normalizePhotos(listing.photos),
          citq_number: (listing.citq_number as string | null) ?? "",
          checkin_time: (listing.checkin_time as string | null) ?? "16:00",
          checkout_time: (listing.checkout_time as string | null) ?? "11:00",
          dogs_allowed: dogPolicy.allowed,
          dogs_max: dogPolicy.max,
          dogs_size_limit: dogPolicy.sizeLimit,
          dogs_fee_type: dogPolicy.feeType,
          dogs_fee_amount: dogPolicy.feeAmount,
          reduced_mobility: accessibility.accessible,
          accessibility_features: accessibility.features,
          smoking_allowed: (listing.smoking_allowed as boolean | null) ?? false,
          checkin_type: ((listing.checkin_type as string | null) === "in_person" ? "in_person" : "autonomous"),
          nearby_activities: Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [],
          price_on_request: (listing.price_on_request as boolean | null) ?? true,
          min_age: (listing.min_age as number | null) ?? 21,
        }}
      />
    </div>
  );
}
