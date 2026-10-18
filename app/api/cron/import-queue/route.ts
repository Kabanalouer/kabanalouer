import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { IMPORT_BATCH_SIZE, importQueueRow } from "@/lib/importQueue";

export const maxDuration = 300;

// On ne commence plus de nouvelle fiche passé ce délai (une fiche = téléchargement et
// ré-encodage des photos + appels à l'IA, de 30 s à 1 min).
const START_BUDGET_MS = 200_000;

// GET — appelé par le cron Vercel (toutes les 15 minutes) : transforme les lignes
// 'pending' de listing_import_queue en fiches non revendiquées, non publiées, détenues
// par le compte système. Voir lib/importQueue.ts. La publication (15 par jour) est faite
// par /api/cron/publish-unclaimed.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sys } = await admin.from("users").select("id").eq("is_system", true).maybeSingle();
  if (!sys) return NextResponse.json({ ok: true, skipped: "Aucun compte système." });

  const { data: rows, error } = await admin
    .from("listing_import_queue")
    .select("id, import_source, import_source_url, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(IMPORT_BATCH_SIZE);
  if (error) {
    console.error("[cron import-queue]", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const report: { url: string; outcome: string; error?: string }[] = [];
  for (const row of rows ?? []) {
    if (Date.now() - startedAt > START_BUDGET_MS) break;
    // Prise en charge : deux exécutions simultanées ne traitent pas la même ligne
    const { data: claimed } = await admin
      .from("listing_import_queue")
      .update({ attempts: (row.attempts as number) + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("attempts", row.attempts)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const result = await importQueueRow(
      admin,
      { id: row.id as string, import_source: row.import_source as string, import_source_url: row.import_source_url as string, payload: row.payload, attempts: (row.attempts as number) + 1 },
      sys.id as string
    );
    report.push({ url: row.import_source_url as string, ...result });
  }

  return NextResponse.json({ ok: true, processed: report.length, report });
}
