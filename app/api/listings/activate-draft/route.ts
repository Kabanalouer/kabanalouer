import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { getRequestLocale, t2 } from "@/lib/requestLocale";

// Activation par le propriétaire d'une fiche en brouillon (mode_publication = 'brouillon') après la revendication :
// il confirme ses droits sur les photos et le numéro CITQ, puis la fiche est publiée, sans limite quotidienne (jamais de
// publie_le : ces fiches ne comptent pas dans les 15 par jour de publish-unclaimed).
// Écritures avec le client service : mode_publication et import_raw_data sont protégées contre les sessions
// (déclencheurs protect_listing_claim_columns / protect_listing_import_columns) ; la propriété est vérifiée ici.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;

type ItemResult = { id: string; ok: boolean; error?: "not_eligible" | "incomplete" | "subscription_required" | "failed" };

function montrealDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function POST(req: Request) {
  const locale = getRequestLocale(req);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: unknown; photosRightsConfirmed?: unknown } | null;
  if (!body || body.photosRightsConfirmed !== true) {
    return NextResponse.json({ error: t2(locale, "Confirmez vos droits sur les photos pour continuer.", "Confirm your rights to the photos to continue.") }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: t2(locale, "Demande invalide.", "Invalid request.") }, { status: 400 });
  }
  const parsed: { id: string; citq: string }[] = [];
  for (const it of items) {
    const { id, citq } = (it ?? {}) as { id?: unknown; citq?: unknown };
    if (typeof id !== "string" || !UUID.test(id) || typeof citq !== "string" || !/^[0-9]{6}$/.test(citq.trim())) {
      return NextResponse.json({ error: t2(locale, "Le numéro CITQ doit comporter 6 chiffres.", "The CITQ number must have 6 digits.") }, { status: 400 });
    }
    if (!parsed.some((p) => p.id === id)) parsed.push({ id, citq: citq.trim() });
  }

  const admin = adminSupabase();
  const { data: rows } = await admin
    .from("listings")
    .select("id, host_id, claim_status, mode_publication, is_published, title, description, photos, region, import_raw_data")
    .in("id", parsed.map((p) => p.id));
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));

  const { data: subs } = await admin.from("subscriptions").select("listing_id, status").in("listing_id", parsed.map((p) => p.id));
  const activeSub = new Set((subs ?? []).filter((s) => s.status === "active").map((s) => s.listing_id as string));

  const today = montrealDate();
  const results: ItemResult[] = [];
  for (const { id, citq } of parsed) {
    const l = byId.get(id);
    if (!l || l.host_id !== user.id || l.claim_status !== "claimed" || l.mode_publication !== "brouillon" || l.is_published) {
      results.push({ id, ok: false, error: "not_eligible" });
      continue;
    }
    const complete =
      ((l.title as string | null) ?? "").trim().length > 0 &&
      ((l.description as string | null) ?? "").trim().length >= 40 &&
      Array.isArray(l.photos) && (l.photos as unknown[]).length >= 5 &&
      ((l.region as string | null) ?? "").trim().length > 0;
    if (!complete) {
      results.push({ id, ok: false, error: "incomplete" });
      continue;
    }
    if (!activeSub.has(id)) {
      results.push({ id, ok: false, error: "subscription_required" });
      continue;
    }
    const raw = (l.import_raw_data as Record<string, unknown> | null) ?? {};
    const { data: updated, error } = await admin
      .from("listings")
      .update({
        is_published: true,
        mode_publication: null,
        citq_number: citq,
        photos_rights_confirmed: true,
        unpublished_at: null,
        unpublished_reason: null,
        import_raw_data: { ...raw, active_le: today },
      })
      .eq("id", id)
      .eq("host_id", user.id)
      .eq("claim_status", "claimed")
      .eq("mode_publication", "brouillon")
      .eq("is_published", false)
      .select("id");
    if (error || !updated || updated.length === 0) {
      if (error) console.error("listings/activate-draft: échec", id, error.message);
      results.push({ id, ok: false, error: "failed" });
      continue;
    }
    results.push({ id, ok: true });
  }

  return NextResponse.json({ results });
}
