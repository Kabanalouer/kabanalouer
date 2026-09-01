import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import EditListingForm from "@/components/dashboard/EditListingForm";
import { normalizePhotos } from "@/lib/photo";
import type { BlockedEntry } from "@/components/dashboard/AvailabilityCalendar";
import { getNextPaidRank, priceForRank } from "@/lib/subscriptionPricing";

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

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (!listing) notFound();

  const admin = adminSupabase();

  const [{ data: subscription }, { data: userRow }, nextPaidRank, { data: blockedDates }] = await Promise.all([
    // Par listing_id, pas user_id — un proprio peut avoir plusieurs annonces,
    // donc plusieurs lignes subscriptions ; .maybeSingle() échouerait sinon.
    supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("listing_id", id)
      .maybeSingle(),
    supabase.from("users").select("free_launch_claimed_at").eq("id", user.id).single(),
    getNextPaidRank(admin, user.id),
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
        <p className="text-gray-500 text-sm mt-1 line-clamp-1">{listing.title}</p>
      </div>
      <EditListingForm
        userId={user.id}
        listingId={id}
        isPublished={listing.is_published ?? false}
        initialCity={listing.city ?? ""}
        initialLat={listing.latitude ?? null}
        initialLng={listing.longitude ?? null}
        subscriptionStatus={subscription?.status ?? null}
        subscriptionExpiresAt={subscription?.expires_at ?? null}
        hasClaimedFreeLaunch={!!userRow?.free_launch_claimed_at}
        nextPaidPriceCents={nextPaidPriceCents}
        initialBlocked={(blockedDates ?? []) as BlockedEntry[]}
        icalUrl={(listing.ical_url as string | null) ?? null}
        icalLastSync={(listing.ical_last_sync as string | null) ?? null}
        listingCreatedAt={(listing.created_at as string) ?? new Date().toISOString()}
        viewsListing={(listing.views_listing as number) ?? 0}
        initialData={{
          title: listing.title ?? "",
          description: listing.description ?? "",
          region: listing.region ?? "",
          address: listing.address ?? "",
          capacity: listing.capacity ?? 4,
          bedrooms: listing.bedrooms ?? 2,
          bathrooms: listing.bathrooms ?? 1,
          price_low: listing.price_low ?? 0,
          price_high: listing.price_high ?? 0,
          price_peak: listing.price_peak ?? 0,
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
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
