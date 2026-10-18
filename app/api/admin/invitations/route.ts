import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { listInvitationCandidates, sendInvitation, type InvitationKind } from "@/lib/claims/invitations";

export const maxDuration = 120;

// Envoi des invitations et relances depuis Admin → Invitations (admin seulement).
// Pas plus de MAX_PER_CALL courriels par appel (« Tout envoyer » reste à refaire tant qu'il
// en reste), espacés pour respecter la limite d'envoi de Resend.
const MAX_PER_CALL = 40;
const DELAY_MS = 650;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind as InvitationKind;
  if (kind !== "invite" && kind !== "reminder") return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  const emails: string[] | null = Array.isArray(body.emails) ? body.emails.map((e: unknown) => String(e).toLowerCase()) : null;
  if (!emails && body.all !== true) return NextResponse.json({ error: "Aucune adresse" }, { status: 400 });

  const admin = adminSupabase();
  const candidates = await listInvitationCandidates(admin, kind);
  const chosen = emails ? candidates.filter((c) => emails.includes(c.claimEmail)) : candidates;
  const batch = chosen.slice(0, MAX_PER_CALL);

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  for (let i = 0; i < batch.length; i++) {
    const result = await sendInvitation(admin, batch[i], kind);
    if (result === "sent") sent++;
    else if (result === "skipped") skipped++;
    else errors++;
    if (i < batch.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  return NextResponse.json({ ok: true, sent, skipped, errors, remaining: Math.max(0, chosen.length - batch.length) });
}
