import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { computeScore } from "@/lib/listingScore";
import type { AmenityValue } from "@/lib/amenities-catalog";
import { localePath } from "@/lib/localePath";
import ListingsClient from "@/components/dashboard/ListingsClient";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: locale === "en" ? "Dashboard" : "Tableau de bord" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginLocale = await getLocale();
    redirect(localePath(`/login?next=${encodeURIComponent(localePath("/dashboard", loginLocale))}`, loginLocale));
  }

  const userId = user.id;

  const [t, locale] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
  ]);

  const [{ data: profile }, { data: listings }] = await Promise.all([
    supabase.from("users").select("name, bio, avatar_url").eq("id", userId).single(),
    supabase.from("listings").select("*").eq("host_id", userId).order("created_at", { ascending: false }),
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

  const reviewMap = new Map<string, { count: number; avg: number }>();
  const reviewCounts = new Map<string, { total: number; recent: number }>();
  for (const r of (reviews ?? [])) {
    const prev = reviewMap.get(r.listing_id) ?? { count: 0, avg: 0 };
    const count = prev.count + 1;
    reviewMap.set(r.listing_id, { count, avg: (prev.avg * prev.count + r.rating) / count });
    const pc = reviewCounts.get(r.listing_id) ?? { total: 0, recent: 0 };
    reviewCounts.set(r.listing_id, { total: pc.total + 1, recent: pc.recent + (new Date(r.created_at) >= sixMonthsAgo ? 1 : 0) });
  }

  const roomsPerListing = new Map<string, { photos: unknown }[]>();
  for (const room of (rooms ?? [])) {
    const arr = roomsPerListing.get(room.listing_id) ?? [];
    arr.push(room);
    roomsPerListing.set(room.listing_id, arr);
  }

  const futureAvailSet = new Set((futureAvail ?? []).map((a) => a.listing_id as string));

  const scoreMap = new Map<string, number>();
  for (const listing of (listings ?? [])) {
    const id = listing.id as string;
    const photoList = Array.isArray(listing.photos) ? listing.photos as string[] : [];
    const listingRooms = roomsPerListing.get(id) ?? [];
    const roomsAllHavePhotos = listingRooms.length > 0 && listingRooms.every((r) => Array.isArray(r.photos) && (r.photos as string[]).length > 0);
    const rc = reviewCounts.get(id) ?? { total: 0, recent: 0 };
    scoreMap.set(id, computeScore({
      photoCount: photoList.length,
      title: (listing.title as string) ?? "",
      description: (listing.description as string) ?? "",
      amenities: Array.isArray(listing.amenities) ? listing.amenities as AmenityValue[] : [],
      nearbyActivities: Array.isArray(listing.nearby_activities) ? listing.nearby_activities as string[] : [],
      citqNumber: (listing.citq_number as string) ?? "",
      icalUrl: (listing.ical_url as string | null) ?? null,
      hasFutureBlocked: futureAvailSet.has(id),
      roomsAllHavePhotos,
      bioFilled: !!profile?.bio?.trim(),
      avatarFilled: !!profile?.avatar_url?.trim(),
      reviewCount: rc.total,
      recentReviewCount: rc.recent,
    }));
  }

  const isEn = locale === "en";
  const firstName = profile?.name?.split(" ")[0] ?? (isEn ? "there" : "là");
  const displayTitle = (l: { title?: string | null; title_en?: string | null }) =>
    (isEn && l.title_en?.trim()) || l.title || "";
  const dateLocale = locale === "en" ? "en-CA" : "fr-CA";
  const dateDisplay = new Date().toLocaleDateString(dateLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">{t("greeting", { firstName })}</h1>
        <p className="text-charcoal-400 mt-1 text-sm">{dateDisplay}</p>
      </div>

      {/* ── Stats (client component with period filter) ──────────────────── */}
      {/* Masquée tant qu'aucune annonce n'existe — évite un mur de "0"/tirets
          juste au-dessus de l'état vide "Créer une annonce" ci-dessous. */}
      {listings && listings.length > 0 && (
        <DashboardStats listings={listings.map((l) => ({ id: l.id, title: displayTitle(l) || t("untitled") }))} />
      )}

      {/* ── Listings ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-heading-2 font-semibold text-charcoal-800 min-w-0">{t("myListings")}</h2>
        <Link
          href={localePath("/dashboard/listings/new", locale)}
          aria-label={t("createListing")}
          className="shrink-0 flex items-center justify-center gap-1.5 bg-primary text-white text-sm w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{t("createListing")}</span>
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <ListingsClient
          listings={listings}
          reviews={Object.fromEntries(reviewMap)}
          scores={Object.fromEntries(scoreMap)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-2">{t("emptyTitle")}</h3>
          <p className="text-charcoal-400 text-base mb-6 max-w-sm mx-auto">
            {t("emptyDescription")}
          </p>
          <Link
            href={localePath("/dashboard/listings/new", locale)}
            className="inline-block bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            {t("emptyCta")}
          </Link>
        </div>
      )}
    </div>
  );
}
