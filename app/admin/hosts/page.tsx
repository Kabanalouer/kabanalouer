import { createClient } from "@/lib/supabase/server";
import AdminHostsClient, { type HostRow, type SubLabel } from "@/components/admin/AdminHostsClient";

export const metadata = { title: "Propriétaires — Administration" };

export default async function AdminHostsPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: listings }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, avatar_url, created_at")
      .eq("role", "host")
      .order("created_at", { ascending: false }),
    supabase.from("listings").select("id, host_id, title, is_published"),
    supabase.from("subscriptions").select("user_id, listing_id, status, is_free_launch, expires_at, created_at"),
  ]);

  // Listing counts per host
  const listingMap = new Map<string, { total: number; published: number }>();
  for (const l of (listings ?? [])) {
    const id = l.host_id as string;
    const prev = listingMap.get(id) ?? { total: 0, published: 0 };
    listingMap.set(id, { total: prev.total + 1, published: prev.published + (l.is_published ? 1 : 0) });
  }

  // Titre de chaque annonce, pour l'affichage par abonnement
  const listingTitleMap = new Map<string, string>();
  for (const l of (listings ?? [])) {
    listingTitleMap.set(l.id as string, (l.title as string) || "Chalet sans titre");
  }

  function getSubLabel(status: string, isFreeLaunch: boolean): SubLabel {
    if (status === "active" && isFreeLaunch) return "free_launch";
    if (status === "active") return "active";
    return "expired";
  }

  // Abonnements par proprio — un proprio multi-annonces a une entrée par annonce,
  // plus de collapsing par user_id (chaque annonce a son propre abonnement depuis
  // la restructuration per-listing).
  const subsByHost = new Map<string, HostRow["subscriptions"]>();
  for (const s of (subscriptions ?? [])) {
    const hostId = s.user_id as string;
    const listingId = s.listing_id as string;
    const arr = subsByHost.get(hostId) ?? [];
    arr.push({
      listingId,
      listingTitle: listingTitleMap.get(listingId) ?? "Chalet sans titre",
      isFreeLaunch: !!(s.is_free_launch as boolean),
      expiresAt: (s.expires_at as string | null) ?? null,
      createdAt: (s.created_at as string | null) ?? null,
      subLabel: getSubLabel(s.status as string, !!(s.is_free_launch as boolean)),
    });
    subsByHost.set(hostId, arr);
  }

  const rows: HostRow[] = (users ?? []).map((u) => {
    const id = u.id as string;
    const counts = listingMap.get(id) ?? { total: 0, published: 0 };
    return {
      id,
      name: (u.name as string) ?? "",
      email: (u.email as string) ?? "",
      avatarUrl: (u.avatar_url as string | null) ?? null,
      totalListings: counts.total,
      publishedListings: counts.published,
      createdAt: (u.created_at as string) ?? "",
      subscriptions: subsByHost.get(id) ?? [],
    };
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Propriétaires</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">{rows.length} proprio{rows.length !== 1 ? "s" : ""} au total</p>
      </div>
      <AdminHostsClient hosts={rows} />
    </div>
  );
}
