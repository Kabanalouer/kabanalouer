import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AUTO_INVITATIONS_ENABLED, listInvitationCandidates, sendInvitation, type InvitationKind } from "@/lib/claims/invitations";

export const maxDuration = 120;

// Plafonds par exécution (une exécution par jour) : l'invitation suit la publication
// (15 fiches par jour), et la relance suit l'invitation de REMINDER_DELAY_DAYS jours.
const MAX_INVITES_PER_RUN = 30;
const MAX_REMINDERS_PER_RUN = 30;
const DELAY_MS = 650; // limite d'envoi de Resend

// Heure d'envoi (Montréal). Le cron Vercel est en UTC : il passe à 12 h et à 13 h UTC et
// n'envoie qu'au passage qui tombe à 8 h à Montréal (heure d'été comme d'hiver).
const SEND_HOUR = 8;

function montrealHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", hour: "2-digit", hourCycle: "h23" }).format(now));
}

// GET — appelé par le cron Vercel (chaque jour à 8 h, heure de Montréal, après la
// publication du matin par publish-unclaimed) :
// envoie l'invitation aux adresses qui ont une fiche non revendiquée publiée et qui n'en
// ont pas encore reçu, puis la relance (une seule) à celles invitées il y a 3 jours ou plus
// qui n'ont toujours pas revendiqué. Mêmes règles et même clé unique que l'envoi manuel
// d'Admin → Invitations (lib/claims/invitations.ts) : jamais deux invitations, ni deux
// relances, par adresse. Interrupteur : AUTO_INVITATIONS_ENABLED.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!AUTO_INVITATIONS_ENABLED) return NextResponse.json({ ok: true, enabled: false });
  if (montrealHour(new Date()) !== SEND_HOUR) return NextResponse.json({ ok: true, skipped: "Pas 8 h à Montréal." });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const result: Record<string, { sent: number; skipped: number; errors: number; remaining: number }> = {};

  for (const [kind, max] of [["invite", MAX_INVITES_PER_RUN], ["reminder", MAX_REMINDERS_PER_RUN]] as [InvitationKind, number][]) {
    const candidates = await listInvitationCandidates(admin, kind);
    const batch = candidates.slice(0, max);
    let sent = 0;
    let skipped = 0;
    let errors = 0;
    for (let i = 0; i < batch.length; i++) {
      const r = await sendInvitation(admin, batch[i], kind);
      if (r === "sent") sent++;
      else if (r === "skipped") skipped++;
      else errors++;
      if (i < batch.length - 1) await new Promise((res) => setTimeout(res, DELAY_MS));
    }
    result[kind] = { sent, skipped, errors, remaining: Math.max(0, candidates.length - batch.length) };
  }
  return NextResponse.json({ ok: true, ...result });
}
