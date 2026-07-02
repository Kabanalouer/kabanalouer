import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 20;

export async function checkAiRateLimit(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_CALLS) return false;

  await supabase.from("ai_usage_log").insert({ user_id: userId, endpoint });
  return true;
}
