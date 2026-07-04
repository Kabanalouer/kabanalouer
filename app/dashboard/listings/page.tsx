import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ListingsClient from "@/components/dashboard/ListingsClient";
import { computeScore } from "@/lib/listingScore";

export const metadata = { title: "Mes chalets" };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("listings");

  const [{ data: listings }, { data: profile }] = await Promise.all([
    supabase.from("listings").select("*").eq("host_id", user.id).order("created_at", { ascending: false }),
    supabase.from("users").select("bio, avatar_url").eq("id", user.id).single(),
  ]);

  const listingIds = (listings ?? []).map((l) => l.id as string);
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [{ data: reviews }, { data: rooms }, { data: futureAvail }] = listingIds.length > 0
    ? await Promise.all([
        supabase.from("reviews").select("listing_id, rating, created_at").in("listing_id", listingIds),
        supabase.from("rooms").select("listing_id, photos").in("listing_id", listingIds),
        supabase.from("availability").select("listing_id").in("listing_id", listingIds).gte("date", today).eq("source", "manual"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const reviewRecord: Record<string, { count: number; avg: number }> = {};
  const reviewCounts: Record<string, { total: number; recent: number }> = {};
  for (const r of (reviews ?? [])) {
    const prev = reviewRecord[r.listing_id] ?? { count: 0, avg: 0 };
    const count = prev.count + 1;
    reviewRecord[r.listing_id] = { count, avg: (prev.avg * prev.count + r.rating) / count };
    const pc = reviewCounts[r.listing_id] ?? { total: 0, recent: 0 };
    reviewCounts[r.listing_id] = { total: pc.total + 1, recent: pc.recent + (new Date(r.created_at) >= sixMonthsAgo ? 1 : 0) };
  }

  const roomsPerListing: Record<string, { listing_id: string; photos: unknown }[]> = {};
  for (const room of (rooms ?? [])) {
    (roomsPerListing[room.listing_id] ??= []).push(room);
  }

  const futureAvailSet = new Set((futureAvail ?? []).map((a) => a.listing_id as string));

  const scoreRecord: Record<string, number> = {};
  for (const listing of (listings ?? [])) {
    const id = listing.id as string;
    const photoList = Array.isArray(listing.photos) ? listing.photos as string[] : [];
    const listingRooms = roomsPerListing[id] ?? [];
    const roomsAllHavePhotos = listingRooms.length > 0 && listingRooms.every((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0);
    const rc = reviewCounts[id] ?? { total: 0, recent: 0 };
    scoreRecord[id] = computeScore({
      photoCount: photoList.length,
      title: (listing.title as string) ?? "",
      description: (listing.description as string) ?? "",
      amenities: Array.isArray(listing.amenities) ? listing.amenities as string[] : [],
      nearbyActivities: Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [],
      citqNumber: (listing.citq_number as string) ?? "",
      icalUrl: (listing.ical_url as string | null) ?? null,
      hasFutureBlocked: futureAvailSet.has(id),
      roomsAllHavePhotos,
      bioFilled: !!profile?.bio?.trim(),
      avatarFilled: !!profile?.avatar_url?.trim(),
      reviewCount: rc.total,
      recentReviewCount: rc.recent,
    });
  }

  const count = listings?.length ?? 0;

  return (
    <div className="max-w-5xl">
      {deleted === "1" && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800 font-medium">{t("deleted")}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-800">{t("heading")}</h1>
          <p className="text-charcoal-500 text-sm mt-1">
            {count === 1 ? t("count", { count }) : t("countPlural", { count })}
          </p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("createListing")}
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <ListingsClient listings={listings} reviews={reviewRecord} scores={scoreRecord} />
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="font-semibold text-charcoal-800 mb-2">{t("emptyTitle")}</h3>
          <p className="text-charcoal-400 text-sm mb-6 max-w-sm mx-auto">
            {t("emptyDescription")}
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            {t("emptyCta")}
          </Link>
        </div>
      )}
    </div>
  );
}
