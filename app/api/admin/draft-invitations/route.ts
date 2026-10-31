import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { listDraftCandidates, previewDraftInvitation, sendDraftInvitation, type DraftCandidate } from "@/lib/claims/invitations";
import { cleanDisplayName, cleanIntro, saveDraftNote } from "@/lib/claims/draftNotes";
import type { DraftInvitationKind } from "@/lib/emails/draftInvitation";

export const maxDuration = 60;

// Invitations et relances brouillon, envoyées à la main depuis Admin → Brouillons (admin seulement).
// Un courriel par clic : aucun envoi automatique, aucun « tout envoyer ». La clé unique de listing_invitations
// (adresse + type) empêche un double envoi même si deux clics arrivent en même temps.

const KINDS: DraftInvitationKind[] = ["draft_invite", "draft_reminder_3", "draft_reminder_10"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return null;
}

function readEmail(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

// POST { action: "send" | "preview", email, kind, intro? }
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const email = readEmail(body.email);
  const kind = body.kind as DraftInvitationKind;
  if (!email || !KINDS.includes(kind)) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  const admin = adminSupabase();

  if (body.action === "preview") {
    // Aperçu depuis les fiches de l'adresse, même si l'envoi n'est pas encore possible (import en cours, relance pas encore due)
    const { data: rows } = await admin
      .from("listings")
      .select("id, title, title_en, region, city, listing_number, custom_slug, claim_language, claim_status")
      .eq("claim_email", email)
      .eq("mode_publication", "brouillon")
      .eq("is_test", false)
      .order("title");
    if (!rows || rows.length === 0) return NextResponse.json({ error: "Aucune fiche en brouillon pour cette adresse" }, { status: 404 });
    const candidate: DraftCandidate = {
      claimEmail: email,
      lang: rows[0].claim_language === "en" ? "en" : "fr",
      listings: rows,
      claimed: rows.every((r: { claim_status: string }) => r.claim_status === "claimed"),
    };
    const preview = await previewDraftInvitation(candidate, kind, cleanIntro(body.intro), cleanDisplayName(body.displayName));
    if (!preview) return NextResponse.json({ error: "Aperçu impossible" }, { status: 500 });
    return NextResponse.json({ subject: preview.subject, html: preview.html }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "send") {
    // L'adresse doit être à envoyer MAINTENANT selon les règles (plus d'import en attente, pas déjà envoyé, relance due)
    const candidate = (await listDraftCandidates(admin, kind)).find((c) => c.claimEmail.trim().toLowerCase() === email);
    if (!candidate) {
      return NextResponse.json(
        { error: kind === "draft_invite" ? "Pas prête : import en cours, invitation déjà envoyée ou adresse retirée." : "Cette relance n’est pas due (ou déjà envoyée)." },
        { status: 409 }
      );
    }
    const result = await sendDraftInvitation(admin, candidate, kind);
    if (result === "sent") return NextResponse.json({ ok: true });
    if (result === "skipped") return NextResponse.json({ error: "Déjà envoyé." }, { status: 409 });
    return NextResponse.json({ error: "Échec de l’envoi, rien n’est parti. Réessayez." }, { status: 500 });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

// PUT { email, intro_fr?, intro_en?, site_url?, display_name? } : enregistre la phrase d'ouverture, le site d'origine et le nom affiché
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const email = readEmail(body.email);
  if (!email) return NextResponse.json({ error: "Adresse invalide" }, { status: 400 });

  const fields: { intro_fr?: unknown; intro_en?: unknown; site_url?: unknown; display_name?: unknown } = {};
  for (const key of ["intro_fr", "intro_en", "site_url", "display_name"] as const) if (key in body) fields[key] = body[key];
  const { error } = await saveDraftNote(adminSupabase(), email, fields);
  if (error) {
    console.error("[admin draft-invitations] enregistrement", error);
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
