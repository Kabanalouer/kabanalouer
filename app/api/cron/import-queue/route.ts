import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { IMPORT_BATCH_SIZE, importQueueRow } from "@/lib/importQueue";
import { AUTO_INVITATIONS_ENABLED, listDraftCandidates, sendDraftInvitation } from "@/lib/claims/invitations";
import { DRAFT_INVITATIONS_ENABLED } from "@/lib/draftInvitationsConfig";

export const maxDuration = 300;

// Invitations brouillon : fenêtre d'envoi (heure de Montréal), plafond par passage, délai entre courriels (limite d'envoi de Resend).
const DRAFT_INVITE_FIRST_HOUR = 8;
const DRAFT_INVITE_LAST_HOUR = 19;
const MAX_DRAFT_INVITES_PER_RUN = 10;
const INVITE_DELAY_MS = 650;

// On ne commence plus de nouvelle fiche passé ce délai (une fiche = téléchargement et
// ré-encodage des photos + appels à l'IA, de 30 s à 1 min).
const START_BUDGET_MS = 200_000;

// GET — appelé par le cron Vercel (toutes les 5 minutes) : transforme les lignes
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

  const draftInvites = await sendDraftInvitations(admin);

  return NextResponse.json({ ok: true, processed: report.length, report, draftInvites });
}

// Invitations des propriétaires en mode brouillon : une seule par adresse, dès qu'aucune ligne de la file n'attend plus
// pour cette adresse (la dernière fiche vient d'être importée ou refusée). Entre 8 h et 19 h à Montréal seulement.
// Les relances J+3 et J+10 sont faites par send-invitations.
async function sendDraftInvitations(admin: Parameters<typeof importQueueRow>[0]): Promise<{ sent: number; skipped: number; errors: number; outsideHours?: boolean }> {
  const out = { sent: 0, skipped: 0, errors: 0 };
  if (!AUTO_INVITATIONS_ENABLED || !DRAFT_INVITATIONS_ENABLED) return out;
  const hour = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (hour < DRAFT_INVITE_FIRST_HOUR || hour >= DRAFT_INVITE_LAST_HOUR) return { ...out, outsideHours: true };

  const candidates = (await listDraftCandidates(admin, "draft_invite")).slice(0, MAX_DRAFT_INVITES_PER_RUN);
  for (let i = 0; i < candidates.length; i++) {
    const r = await sendDraftInvitation(admin, candidates[i], "draft_invite");
    if (r === "sent") out.sent++;
    else if (r === "skipped") out.skipped++;
    else out.errors++;
    if (i < candidates.length - 1) await new Promise((res) => setTimeout(res, INVITE_DELAY_MS));
  }
  return out;
}
