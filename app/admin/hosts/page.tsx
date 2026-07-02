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
    supabase.from("listings").select("host_id, is_published"),
    supabase.from("subscriptions").select("user_id, status, is_free_launch, expires_at, created_at"),
  ]);

  // Listing counts per host
  const listingMap = new Map<string, { total: number; published: number }>();
  for (const l of (listings ?? [])) {
    const id = l.host_id as string;
    const prev = listingMap.get(id) ?? { total: 0, published: 0 };
    listingMap.set(id, { total: prev.total + 1, published: prev.published + (l.is_published ? 1 : 0) });
  }

  // Subscription per user (one row per user due to onConflict: "user_id")
  const subMap = new Map<string, { status: string; isFreeLaunch: boolean; expiresAt: string | null; createdAt: string | null }>();
  for (const s of (subscriptions ?? [])) {
    subMap.set(s.user_id as string, {
      status: s.status as string,
      isFreeLaunch: !!(s.is_free_launch as boolean),
      expiresAt: (s.expires_at as string | null) ?? null,
      createdAt: (s.created_at as string | null) ?? null,
    });
  }

  function getSubLabel(sub: ReturnType<typeof subMap.get> | null): SubLabel {
    if (!sub) return "none";
    if (sub.status === "active" && sub.isFreeLaunch) return "free_launch";
    if (sub.status === "active") return "active";
    return "expired";
  }

  const rows: HostRow[] = (users ?? []).map((u) => {
    const id = u.id as string;
    const counts = listingMap.get(id) ?? { total: 0, published: 0 };
    const sub = subMap.get(id) ?? null;
    return {
      id,
      name: (u.name as string) ?? "",
      email: (u.email as string) ?? "",
      avatarUrl: (u.avatar_url as string | null) ?? null,
      totalListings: counts.total,
      publishedListings: counts.published,
      createdAt: (u.created_at as string) ?? "",
      subscription: sub,
      subLabel: getSubLabel(sub),
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
