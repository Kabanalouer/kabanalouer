import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { activateClaimedDrafts } from "@/lib/claims/activateDrafts";

// Bouton « Activer » de Mes chalets, pour les fiches en brouillon déjà revendiquées qui n'ont pas pu être mises en ligne
// à la revendication (fiche à compléter, CITQ manquant, abonnement à régler). Aucune confirmation des droits sur les
// photos (décision de Simon, 2026-10-31) ; le CITQ n'est demandé que s'il manque. Logique partagée avec la revendication :
// lib/claims/activateDrafts.ts (client service, propriété vérifiée, sans limite quotidienne).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;

export async function POST(req: Request) {
  const locale = getRequestLocale(req);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const items = Array.isArray(body?.items) ? (body?.items as unknown[]) : [];
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: t2(locale, "Demande invalide.", "Invalid request.") }, { status: 400 });
  }
  const ids: string[] = [];
  const citqs: Record<string, string> = {};
  for (const it of items) {
    const { id, citq } = (it ?? {}) as { id?: unknown; citq?: unknown };
    if (typeof id !== "string" || !UUID.test(id)) {
      return NextResponse.json({ error: t2(locale, "Demande invalide.", "Invalid request.") }, { status: 400 });
    }
    if (!ids.includes(id)) ids.push(id);
    if (typeof citq === "string" && citq.trim() !== "") citqs[id] = citq.trim();
  }

  const results = await activateClaimedDrafts(adminSupabase(), { userId: user.id, listingIds: ids, citqs });
  return NextResponse.json({ results });
}
