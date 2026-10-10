import { createClient as createAdminClient } from "@supabase/supabase-js";

// Indicateurs de santé de la plateforme (Admin → Santé de la plateforme).
// Calculés à la volée depuis Supabase avec le client service (la page est
// déjà réservée aux admins par app/admin/layout.tsx). Chaque indicateur de
// période est aussi calculé sur la période précédente de même durée, pour
// afficher l'évolution.

const DAY = 24 * 60 * 60 * 1000;
const PAGE = 1000;

type Admin = ReturnType<typeof adminSupabase>;

function adminSupabase() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Supabase renvoie au plus 1000 lignes par requête : on pagine.
async function fetchAll<T>(admin: Admin, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} : ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

type Msg = { listing_id: string; sender_id: string; receiver_id: string; created_at: string };
type Listing = { id: string; host_id: string; title: string | null; region: string | null; city: string | null; is_published: boolean; created_at: string; views_listing: number | null };
type User = { id: string; name: string | null; role: string; created_at: string };
type Sub = { listing_id: string | null; created_at: string };
type Review = { rating: number | null; created_at: string };
type ReviewRequest = { prompted_at: string | null };
type Nudge = { status: string; created_at: string };
type FunnelCount = { day: string; step: string; count: number };
type ErrorGroupRow = { message: string; source: string; count: number; last_seen_at: string; resolved_at: string | null };

export type FunnelRow = { label: string; count: number; note?: string };

export type Conversation = {
  listingId: string;
  listingTitle: string;
  hostName: string;
  travelerName: string;
  startedAt: number;
  firstReplyAt: number | null;
};

/** Valeur d'une période et de la période précédente */
export type Compared = { current: number; previous: number };

export type PlatformHealth = {
  days: number;
  supply: {
    newHosts: Compared;
    listingsCreated: Compared;
    listingsFirstPublished: Compared;
    publishedNow: number;
    byRegion: { region: string; count: number }[];
  };
  demand: {
    newTravelers: Compared;
    newConversations: Compared;
    conversationsPerListing: number | null;
    viewsAllTime: number;
  };
  trust: {
    /** Conversations de la période âgées d'au moins 24 h (on laisse au proprio le temps de répondre) */
    eligible: Compared;
    replied: Compared;
    repliedWithin24h: Compared;
    medianReplyHours: number | null;
    nudgesSent: Compared;
    nudgesSkipped: Compared;
  };
  reviews: {
    requested: Compared;
    received: Compared;
    averageRating: number | null;
  };
  funnels: {
    /** null : table funnel_counts absente (supabase/add-funnel-counts.sql pas encore exécuté) */
    trackingSince: string | null;
    available: boolean;
    traveler: FunnelRow[];
    host: FunnelRow[];
  };
  watch: {
    /** null : table error_groups absente (supabase/add-error-groups.sql pas encore exécuté) */
    openErrors: { message: string; source: string; count: number; lastSeenAt: string }[] | null;
    unanswered: (Conversation & { ageHours: number })[];
    abandonedDrafts: { id: string; title: string; hostName: string; ageDays: number }[];
    quietListings: { id: string; title: string; hostName: string; publishedDays: number }[];
  };
};

const inRange = (t: number, from: number, to: number) => t >= from && t < to;

export async function getPlatformHealth(days: number): Promise<PlatformHealth> {
  const admin = adminSupabase();
  const now = Date.now();
  const start = now - days * DAY;
  const prevStart = start - days * DAY;

  const [messages, listings, users, subs, reviews, reviewRequests, nudges] = await Promise.all([
    fetchAll<Msg>(admin, "messages", "listing_id, sender_id, receiver_id, created_at"),
    fetchAll<Listing>(admin, "listings", "id, host_id, title, region, city, is_published, created_at, views_listing"),
    fetchAll<User>(admin, "users", "id, name, role, created_at"),
    fetchAll<Sub>(admin, "subscriptions", "listing_id, created_at"),
    fetchAll<Review>(admin, "reviews", "rating, created_at"),
    fetchAll<ReviewRequest>(admin, "review_requests", "prompted_at"),
    fetchAll<Nudge>(admin, "no_reply_nudges", "status, created_at").catch(() => [] as Nudge[]),
  ]);
  const funnelCounts = await fetchAll<FunnelCount>(admin, "funnel_counts", "day, step, count").catch(() => null);
  const errorGroups = await fetchAll<ErrorGroupRow>(admin, "error_groups", "message, source, count, last_seen_at, resolved_at").catch(() => null);
  const openErrors = errorGroups
    ? errorGroups
        .filter((e) => !e.resolved_at)
        .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))
        .map((e) => ({ message: e.message, source: e.source, count: e.count, lastSeenAt: e.last_seen_at }))
    : null;

  const userById = new Map(users.map((u) => [u.id, u]));
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const nameOf = (id: string) => (userById.get(id)?.name ?? "").trim() || "—";
  const time = (iso: string) => new Date(iso).getTime();

  // Compte sur la période courante et la précédente
  const compare = (times: number[]): Compared => ({
    current: times.filter((t) => inRange(t, start, now)).length,
    previous: times.filter((t) => inRange(t, prevStart, start)).length,
  });

  // ── Conversations : (annonce, voyageur), premier message du voyageur et première réponse du proprio
  const convMap = new Map<string, Conversation>();
  for (const m of messages) {
    const listing = listingById.get(m.listing_id);
    if (!listing) continue;
    const fromHost = m.sender_id === listing.host_id;
    const travelerId = fromHost ? m.receiver_id : m.sender_id;
    const key = `${m.listing_id}:${travelerId}`;
    const t = time(m.created_at);
    let conv = convMap.get(key);
    if (!conv) {
      conv = {
        listingId: listing.id,
        listingTitle: listing.title ?? "Sans titre",
        hostName: nameOf(listing.host_id),
        travelerName: nameOf(travelerId),
        startedAt: Infinity,
        firstReplyAt: null,
      };
      convMap.set(key, conv);
    }
    if (fromHost) conv.firstReplyAt = conv.firstReplyAt === null ? t : Math.min(conv.firstReplyAt, t);
    else conv.startedAt = Math.min(conv.startedAt, t);
  }
  // Conversations lancées par un voyageur (un proprio qui écrit en premier ne compte pas)
  const conversations = [...convMap.values()].filter((c) => Number.isFinite(c.startedAt));

  // ── Offre
  const firstPublication = new Map<string, number>();
  for (const s of subs) {
    if (!s.listing_id) continue;
    const t = time(s.created_at);
    firstPublication.set(s.listing_id, Math.min(firstPublication.get(s.listing_id) ?? Infinity, t));
  }
  const published = listings.filter((l) => l.is_published);
  const regionCounts = new Map<string, number>();
  for (const l of published) regionCounts.set(l.region ?? "Sans région", (regionCounts.get(l.region ?? "Sans région") ?? 0) + 1);

  // ── Confiance : conversations âgées d'au moins 24 h
  const eligibleTimes = (from: number, to: number) =>
    conversations.filter((c) => inRange(c.startedAt, from, to) && now - c.startedAt >= DAY);
  const countBoth = (pick: (c: Conversation) => boolean): Compared => ({
    current: eligibleTimes(start, now).filter(pick).length,
    previous: eligibleTimes(prevStart, start).filter(pick).length,
  });
  const replyHours = eligibleTimes(start, now)
    .filter((c) => c.firstReplyAt !== null && c.firstReplyAt >= c.startedAt)
    .map((c) => (c.firstReplyAt! - c.startedAt) / (60 * 60 * 1000))
    .sort((a, b) => a - b);
  const median = replyHours.length
    ? (replyHours.length % 2 ? replyHours[(replyHours.length - 1) / 2] : (replyHours[replyHours.length / 2 - 1] + replyHours[replyHours.length / 2]) / 2)
    : null;

  // ── Avis
  const reviewsInPeriod = reviews.filter((r) => inRange(time(r.created_at), start, now) && r.rating !== null);
  const averageRating = reviewsInPeriod.length
    ? reviewsInPeriod.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewsInPeriod.length
    : null;

  // ── À surveiller (état actuel, indépendant de la période)
  const unanswered = conversations
    .filter((c) => c.firstReplyAt === null && now - c.startedAt >= DAY)
    .map((c) => ({ ...c, ageHours: Math.floor((now - c.startedAt) / (60 * 60 * 1000)) }))
    .sort((a, b) => b.ageHours - a.ageHours);

  const abandonedDrafts = listings
    .filter((l) => !l.is_published && !firstPublication.has(l.id) && now - time(l.created_at) >= 2 * DAY)
    .map((l) => ({ id: l.id, title: l.title ?? "Sans titre", hostName: nameOf(l.host_id), ageDays: Math.floor((now - time(l.created_at)) / DAY) }))
    .sort((a, b) => a.ageDays - b.ageDays);

  const recentConvListings = new Set(conversations.filter((c) => now - c.startedAt < 30 * DAY).map((c) => c.listingId));
  const quietListings = published
    .map((l) => ({ l, since: firstPublication.get(l.id) ?? time(l.created_at) }))
    .filter(({ l, since }) => now - since >= 14 * DAY && !recentConvListings.has(l.id))
    .map(({ l, since }) => ({ id: l.id, title: l.title ?? "Sans titre", hostName: nameOf(l.host_id), publishedDays: Math.floor((now - since) / DAY) }));

  const newConversations = compare(conversations.map((c) => c.startedAt));

  // ── Tunnels : compteurs du navigateur (par jour, heure du Québec) + étapes tirées de la base
  const startDay = new Date(start).toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const stepTotal = (step: string) =>
    (funnelCounts ?? []).filter((f) => f.step === step && f.day >= startDay).reduce((sum, f) => sum + f.count, 0);
  const newHosts = compare(users.filter((u) => u.role === "host").map((u) => time(u.created_at)));
  const listingsCreated = compare(listings.map((l) => time(l.created_at)));
  const listingsFirstPublished = compare([...firstPublication.values()]);
  const authPrompts = stepTotal("t_auth_prompt");
  const funnels = {
    available: funnelCounts !== null,
    trackingSince: funnelCounts?.length ? funnelCounts.map((f) => f.day).sort()[0] : null,
    traveler: [
      { label: "Visites du site", count: stepTotal("t_visit") },
      { label: "Fiches chalet vues", count: stepTotal("t_listing_view") },
      {
        label: "Clics « Envoyer la demande »",
        count: stepTotal("t_request_click"),
        note: authPrompts ? `dont ${authPrompts} sans compte, invités à se connecter` : undefined,
      },
      { label: "Demandes envoyées", count: stepTotal("t_request_sent") },
    ],
    host: [
      { label: "Visites de Devenir hôte", count: stepTotal("h_landing") },
      { label: "Clics « Créer mon annonce » ou import", count: stepTotal("h_cta") },
      { label: "Inscriptions proprio", count: newHosts.current },
      { label: "Annonces commencées", count: listingsCreated.current },
      { label: "Premières publications", count: listingsFirstPublished.current },
    ],
  };

  return {
    days,
    supply: {
      newHosts,
      listingsCreated,
      listingsFirstPublished,
      publishedNow: published.length,
      byRegion: [...regionCounts.entries()].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
    },
    demand: {
      newTravelers: compare(users.filter((u) => u.role === "traveler").map((u) => time(u.created_at))),
      newConversations,
      conversationsPerListing: published.length ? newConversations.current / published.length : null,
      viewsAllTime: listings.reduce((sum, l) => sum + (l.views_listing ?? 0), 0),
    },
    trust: {
      eligible: countBoth(() => true),
      replied: countBoth((c) => c.firstReplyAt !== null),
      repliedWithin24h: countBoth((c) => c.firstReplyAt !== null && c.firstReplyAt - c.startedAt <= DAY),
      medianReplyHours: median,
      nudgesSent: compare(nudges.filter((n) => n.status === "sent").map((n) => time(n.created_at))),
      nudgesSkipped: compare(nudges.filter((n) => n.status === "skipped").map((n) => time(n.created_at))),
    },
    reviews: {
      requested: compare(reviewRequests.filter((r) => r.prompted_at).map((r) => time(r.prompted_at!))),
      received: compare(reviews.map((r) => time(r.created_at))),
      averageRating,
    },
    funnels,
    watch: { openErrors, unanswered, abandonedDrafts, quietListings },
  };
}
