import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tableau de bord — Kabanalouer" };

// ── Stat helpers ─────────────────────────────────────────────────────────────

function calcResponseStats(
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

function formatResponseTime(ms: number | null): string {
  if (ms === null) return "—";
  const h = ms / 3_600_000;
  if (h < 1)  return "Répond en moins d'1h";
  if (h < 2)  return "Répond en moins de 2h";
  if (h < 4)  return "Répond en moins de 4h";
  if (h < 24) return "Répond en moins d'un jour";
  const d = Math.round(h / 24);
  return `Répond en ${d} jour${d > 1 ? "s" : ""}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;

  // Fetch in parallel
  const [
    { data: profile },
    { data: listings },
    { data: messages },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from("users").select("name").eq("id", userId).single(),
    supabase
      .from("listings")
      .select("id, title, region, is_published, price_low, photos, views_search, views_listing, created_at")
      .eq("host_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("sender_id, receiver_id, created_at")
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order("created_at"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId),
  ]);

  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: reviews } = listingIds.length > 0
    ? await supabase.from("reviews").select("listing_id, rating").in("listing_id", listingIds)
    : { data: [] };

  // Stats
  const totalImpressions = (listings ?? []).reduce((s, l) => s + ((l as Record<string, number>).views_search ?? 0), 0);
  const totalConsultations = (listings ?? []).reduce((s, l) => s + ((l as Record<string, number>).views_listing ?? 0), 0);
  const totalReviews = (reviews ?? []).length;
  const avgRating = totalReviews > 0
    ? (reviews ?? []).reduce((s, r) => s + r.rating, 0) / totalReviews
    : null;

  const { responseRate, avgResponseMs } = calcResponseStats(messages ?? [], userId);

  // Per-listing review map
  const reviewMap = new Map<string, { count: number; avg: number }>();
  for (const r of (reviews ?? [])) {
    const prev = reviewMap.get(r.listing_id) ?? { count: 0, avg: 0 };
    const count = prev.count + 1;
    reviewMap.set(r.listing_id, { count, avg: (prev.avg * prev.count + r.rating) / count });
  }

  // Date
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

      {/* ── Stats grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        <StatCard
          label="Impressions"
          value={totalImpressions.toLocaleString("fr-CA")}
          sub="Apparitions dans la recherche"
          icon="👁"
        />
        <StatCard
          label="Consultations"
          value={totalConsultations.toLocaleString("fr-CA")}
          sub="Visites de vos fiches"
          icon="📄"
        />
        <StatCard
          label="Contacts reçus"
          value={(totalContacts ?? 0).toLocaleString("fr-CA")}
          sub="Messages de voyageurs"
          icon="💬"
        />
        <StatCard
          label="Taux de réponse"
          value={responseRate !== null ? `${responseRate} %` : "—"}
          sub="Messages avec réponse"
          icon="✅"
        />
        <StatCard
          label="Rapidité"
          value={formatResponseTime(avgResponseMs)}
          small
          sub="Temps moyen de réponse"
          icon="⚡"
        />
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avis</span>
            <span className="text-lg">⭐</span>
          </div>
          {avgRating !== null ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 fill-current ${i <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-xs text-gray-400">{totalReviews} avis</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-300 mb-1">—</div>
              <p className="text-xs text-gray-400">Aucun avis pour l&apos;instant</p>
            </>
          )}
        </div>
      </div>

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
            const photo = Array.isArray(listing.photos) ? listing.photos[0] as string | undefined : undefined;
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

function StatCard({
  label, value, sub, icon, small = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`font-bold text-gray-900 mb-1 ${small ? "text-base leading-snug" : "text-2xl"}`}>{value}</div>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
