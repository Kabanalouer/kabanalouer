import { createClient } from "@/lib/supabase/server";
import AdminSubscriptionsClient, {
  type SubscriptionRow,
  type SubType,
  type SubStatus,
} from "@/components/admin/AdminSubscriptionsClient";

export const metadata = { title: "Abonnements — Administration" };

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const [{ data: subs }, { data: listings }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "user_id, stripe_subscription_id, status, is_free_launch, created_at, expires_at, user:user_id(id, name, email, avatar_url)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("listings").select("host_id"),
  ]);

  const listingCounts = new Map<string, number>();
  for (const l of (listings ?? [])) {
    const id = l.host_id as string;
    listingCounts.set(id, (listingCounts.get(id) ?? 0) + 1);
  }

  const now = new Date();

  function resolveType(isFreeLaunch: boolean): SubType {
    if (isFreeLaunch) return "free_launch";
    return "annual";
  }

  function resolveStatus(dbStatus: string, expiresAt: string | null): SubStatus {
    if (dbStatus === "canceled") return "canceled";
    if (dbStatus === "active") {
      if (expiresAt && new Date(expiresAt) < now) return "expired";
      return "active";
    }
    return "expired";
  }

  const rows: SubscriptionRow[] = (subs ?? []).map((s, i) => {
    const userRaw = s.user;
    const user = Array.isArray(userRaw)
      ? (userRaw[0] as { id: string; name: string; email: string; avatar_url: string | null } | undefined)
      : (userRaw as { id: string; name: string; email: string; avatar_url: string | null } | null);

    const userId = s.user_id as string;
    const isFreeLaunch = !!(s.is_free_launch as boolean);
    const dbStatus = (s.status as string) ?? "active";
    const expiresAt = (s.expires_at as string | null) ?? null;

    return {
      id: `${userId}-${i}`,
      userId,
      name: user?.name ?? "",
      email: user?.email ?? "",
      avatarUrl: user?.avatar_url ?? null,
      totalListings: listingCounts.get(userId) ?? 0,
      type: resolveType(isFreeLaunch),
      status: resolveStatus(dbStatus, expiresAt),
      createdAt: (s.created_at as string) ?? "",
      expiresAt,
    };
  });

  const activeRows = rows.filter((r) => r.status === "active");
  const freeLaunchCount = activeRows.filter((r) => r.type === "free_launch").length;
  const paidCount = activeRows.filter((r) => r.type !== "free_launch").length;

  const metrics = {
    totalActive: activeRows.length,
    freeLaunch: freeLaunchCount,
    paid: paidCount,
    revenue: paidCount * 299,
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Abonnements</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {rows.length} abonnement{rows.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <AdminSubscriptionsClient subscriptions={rows} metrics={metrics} />
    </div>
  );
}
