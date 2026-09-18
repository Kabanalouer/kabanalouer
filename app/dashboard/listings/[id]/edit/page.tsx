import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import EditListingForm from "@/components/dashboard/EditListingForm";
import { normalizePhotos } from "@/lib/photo";
import type { BlockedEntry } from "@/components/dashboard/AvailabilityCalendar";
import { getNextPaidRank, priceForRank } from "@/lib/subscriptionPricing";
import type { AmenityValue } from "@/lib/amenities-catalog";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const metadata = { title: "Modifier le chalet" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Pas de filtre host_id ici — RLS laisse passer soit le propriétaire, soit
  // un admin (nouvelle politique "Les admins gèrent tous les listings"). Le
  // filtre par propriété reste vérifié explicitement juste en dessous : RLS
  // laisse aussi voir les annonces PUBLIÉES de n'importe qui (page publique),
  // ce qui ne doit jamais suffire à ouvrir ce formulaire d'édition.
  const [{ data: listing }, { data: viewerProfile }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  if (!listing) notFound();

  const isOwner = listing.host_id === user.id;
  const isAdmin = viewerProfile?.role === "admin";
  if (!isOwner && !isAdmin) notFound();

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

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{listing.title ? "Modifier mon annonce" : "Créer mon annonce"}</h1>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
          <span className="line-clamp-1">{listing.title}</span>
          {listing.title && (
            <a
              href={`/chalets/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Voir la fiche publique"
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
          pets_allowed: (listing.pets_allowed as boolean | null) ?? false,
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
