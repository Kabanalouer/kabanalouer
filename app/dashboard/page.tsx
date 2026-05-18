import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { firstPhotoUrl } from "@/lib/photo";

export const metadata = { title: "Tableau de bord — Kabanalouer" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const [
    { data: profile },
    { data: listings },
  ] = await Promise.all([
    supabase.from("users").select("name").eq("id", userId).single(),
    supabase
      .from("listings")
      .select("id, title, region, is_published, price_low, photos, created_at")
      .eq("host_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  // Per-listing review map (for listing cards)
  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: reviews } = listingIds.length > 0
    ? await supabase.from("reviews").select("listing_id, rating").in("listing_id", listingIds)
    : { data: [] };

  const reviewMap = new Map<string, { count: number; avg: number }>();
  for (const r of (reviews ?? [])) {
    const prev = reviewMap.get(r.listing_id) ?? { count: 0, avg: 0 };
    const count = prev.count + 1;
    reviewMap.set(r.listing_id, { count, avg: (prev.avg * prev.count + r.rating) / count });
  }

  const firstName = profile?.name?.split(" ")[0] ?? "là";
  const dateDisplay = new Date().toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bonjour {firstName} !</h1>
        <p className="text-gray-400 mt-1 text-sm">{dateDisplay}</p>
      </div>

      {/* ── Stats (client component with period filter) ──────────────────── */}
      <DashboardStats />

      {/* ── Listings ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-lg">Mes annonces</h2>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
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
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  {photo ? (
                    <Image src={photo} alt={listing.title ?? ""} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏡</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{listing.title || "Sans titre"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{listing.region}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      listing.is_published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {listing.is_published ? "Publié" : "Brouillon"}
                    </span>
                    {(listing.price_low as number) > 0 && (
                      <span className="text-xs text-gray-500">À partir de {listing.price_low} $/nuit</span>
                    )}
                    {rev && (
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
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
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors hidden sm:block"
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
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🏡</div>
          <h3 className="font-semibold text-gray-900 mb-2">Aucune annonce pour l&apos;instant</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Créez votre première annonce et rejoignez notre communauté d&apos;hôtes !
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            + Créer une annonce
          </Link>
        </div>
      )}
    </div>
  );
}
