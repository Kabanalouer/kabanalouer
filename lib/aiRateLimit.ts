import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const HOUR_MS = 60 * 60 * 1000;

// Limites par fonction (par utilisateur). La traduction reste large : remplir
// une fiche de 80 photos demande une traduction par légende. Les générations
// de texte (plus coûteuses) et l'import Airbnb (Apify payant) sont serrés.
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "translate-listing": { max: 200, windowMs: HOUR_MS },
  "listings-import-apify": { max: 5, windowMs: 24 * HOUR_MS },
};
const DEFAULT_LIMIT = { max: 20, windowMs: HOUR_MS };

export async function checkAiRateLimit(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const { max, windowMs } = LIMITS[endpoint] ?? DEFAULT_LIMIT;
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if ((count ?? 0) >= max) return false;

  await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
  return true;
}
