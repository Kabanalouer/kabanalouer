import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { refreshListingScores } from "@/lib/refreshListingScores";

export const maxDuration = 120;

// Tous les jours à 2 h 30 : remet à jour le score d'optimisation de chaque fiche publiée, qui sert au
// classement (voir lib/refreshListingScores.ts).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const result = await refreshListingScores(admin);
  return NextResponse.json(result);
}
