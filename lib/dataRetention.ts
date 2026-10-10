import { createClient as createAdminClient } from "@supabase/supabase-js";

// Durées de conservation annoncées dans la politique de confidentialité
// (section 6, « Retours et données techniques ») — appliquées chaque nuit par
// le cron expire-featured. Modifier les deux ensemble.
//   feedback        : 24 mois après l'envoi
//   error_groups    : 12 mois après la dernière apparition
//   funnel_counts   : 25 mois (totaux anonymes par jour)
//   weekly_reports  : 24 mois
const MONTH = 30 * 86_400_000;

export async function purgeExpiredData(): Promise<Record<string, number | string>> {
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const before = (months: number) => new Date(Date.now() - months * MONTH).toISOString();
  const jobs: [string, () => PromiseLike<{ error: { message: string } | null; count: number | null }>][] = [
    ["feedback", () => db.from("feedback").delete({ count: "exact" }).lt("created_at", before(24))],
    ["error_groups", () => db.from("error_groups").delete({ count: "exact" }).lt("last_seen_at", before(12))],
    ["funnel_counts", () => db.from("funnel_counts").delete({ count: "exact" }).lt("day", before(25).slice(0, 10))],
    ["weekly_reports", () => db.from("weekly_reports").delete({ count: "exact" }).lt("created_at", before(24))],
  ];
  const result: Record<string, number | string> = {};
  for (const [table, run] of jobs) {
    const { error, count } = await run();
    if (error) console.error(`[dataRetention] ${table}`, error.message);
    result[table] = error ? "erreur" : count ?? 0;
  }
  return result;
}
