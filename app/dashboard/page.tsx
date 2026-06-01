import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { firstPhotoUrl } from "@/lib/photo";
import { computeScore, getScoreLevel } from "@/lib/listingScore";

export const metadata = { title: "Tableau de bord — Kabanalouer" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;

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

  // Per-listing review map (for listing cards + score)
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
    }));
  }

  const firstName = profile?.name?.split(" ")[0] ?? "là";
  const dateDisplay = new Date().toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Bonjour {firstName} !</h1>
        <p className="text-charcoal-400 mt-1 text-sm">{dateDisplay}</p>
      </div>

      {/* ── Stats (client component with period filter) ──────────────────── */}
      <DashboardStats listings={(listings ?? []).map((l) => ({ id: l.id, title: l.title ?? "Sans titre" }))} />

      {/* ── Quick links ─────────────────────────────────────────────────────── */}

      {/* ── Listings ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-charcoal-800 text-lg">Mes annonces</h2>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-full font-semibold hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une annonce
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <div className="space-y-3">
          {listings.map((listing) => {
            const rev = reviewMap.get(listing.id);
            const photo = firstPhotoUrl(listing.photos);
            return (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-[#ebebeb] p-4 flex items-center gap-4 hover:border-charcoal-200 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-charcoal-100 overflow-hidden shrink-0">
                  {photo ? (
                    <Image src={photo} alt={listing.title ?? ""} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal-800 truncate">{listing.title || "Sans titre"}</p>
                  <p className="text-xs text-charcoal-400 mt-0.5">{listing.region}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      listing.is_published ? "bg-green-50 text-green-700" : "bg-charcoal-100 text-charcoal-500"
                    }`}>
                      {listing.is_published ? "Publié" : "Brouillon"}
                    </span>
                    {(() => { const s = scoreMap.get(listing.id as string) ?? 0; return (
                      <span className="text-xs font-semibold" style={{ color: getScoreLevel(s).color }}>Score : {s}</span>
                    ); })()}
                    {rev && (
                      <span className="text-xs text-charcoal-500 flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {rev.avg.toFixed(1)} ({rev.count})
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {listing.is_published && (
                    <Link
                      href={`/chalets/${listing.id}`}
                      target="_blank"
                      className="text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors hidden sm:block"
                    >
                      Voir la fiche ↗
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="font-semibold text-charcoal-800 mb-2">Aucune annonce pour l&apos;instant</h3>
          <p className="text-charcoal-400 text-sm mb-6 max-w-sm mx-auto">
            Créez votre première annonce et rejoignez notre communauté de propriétaires !
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            + Créer une annonce
          </Link>
        </div>
      )}
    </div>
  );
}
