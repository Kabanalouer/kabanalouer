import { createClient } from "@/lib/supabase/server";
import AdminTravelersClient, { type TravelerRow } from "@/components/admin/AdminTravelersClient";

export const metadata = { title: "Voyageurs — Administration" };

export default async function AdminTravelersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: messages }, { data: reviews }, { data: favorites }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, avatar_url, created_at")
        .eq("role", "traveler")
        .order("created_at", { ascending: false }),
      supabase.from("messages").select("sender_id"),
      supabase.from("reviews").select("author_id"),
      supabase.from("favorites").select("user_id"),
    ]);

  const messageCounts = new Map<string, number>();
  for (const m of (messages ?? [])) {
    const id = m.sender_id as string;
    messageCounts.set(id, (messageCounts.get(id) ?? 0) + 1);
  }

  const reviewCounts = new Map<string, number>();
  for (const r of (reviews ?? [])) {
    const id = r.author_id as string;
    reviewCounts.set(id, (reviewCounts.get(id) ?? 0) + 1);
  }

  const favoriteCounts = new Map<string, number>();
  for (const f of (favorites ?? [])) {
    const id = f.user_id as string;
    favoriteCounts.set(id, (favoriteCounts.get(id) ?? 0) + 1);
  }

  const rows: TravelerRow[] = (users ?? []).map((u) => {
    const id = u.id as string;
    return {
      id,
      name: (u.name as string) ?? "",
      email: (u.email as string) ?? "",
      avatarUrl: (u.avatar_url as string | null) ?? null,
      messageCount: messageCounts.get(id) ?? 0,
      reviewCount: reviewCounts.get(id) ?? 0,
      favoriteCount: favoriteCounts.get(id) ?? 0,
      createdAt: (u.created_at as string) ?? "",
    };
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Voyageurs</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {rows.length} voyageur{rows.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <AdminTravelersClient travelers={rows} />
    </div>
  );
}
