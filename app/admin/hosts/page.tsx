import { createClient } from "@/lib/supabase/server";
import AdminHostsClient, { type HostRow } from "@/components/admin/AdminHostsClient";

export const metadata = { title: "Propriétaires — Administration" };

export default async function AdminHostsPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: listings }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, avatar_url, created_at")
      .eq("role", "host")
      .order("created_at", { ascending: false }),
    supabase.from("listings").select("id, host_id, title, is_published"),
  ]);

  // Listing counts per host
  const listingMap = new Map<string, { total: number; published: number }>();
  for (const l of (listings ?? [])) {
    const id = l.host_id as string;
    const prev = listingMap.get(id) ?? { total: 0, published: 0 };
    listingMap.set(id, { total: prev.total + 1, published: prev.published + (l.is_published ? 1 : 0) });
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
