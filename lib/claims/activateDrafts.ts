// Mise en ligne des fiches en brouillon (mode_publication = 'brouillon') une fois revendiquées.
// Appelée à la revendication (lib/claims/actions.ts : le propriétaire n'a rien d'autre à faire, décision de Simon,
// 2026-10-31 : ni confirmation du CITQ ni des droits sur les photos) et par le bouton « Activer » de Mes chalets
// (/api/listings/activate-draft) pour les fiches qui n'ont pas pu être mises en ligne à la revendication.
// Écritures avec le client service : mode_publication et import_raw_data sont protégées contre les sessions.
// Jamais de publie_le : ces fiches ne comptent pas dans les 15 par jour de publish-unclaimed.

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type ActivationError = "not_eligible" | "incomplete" | "citq_missing" | "subscription_required" | "failed";
export type ActivationResult = { id: string; ok: boolean; error?: ActivationError };

export type DraftRow = {
  id: string;
  host_id: string | null;
  claim_status: string | null;
  mode_publication: string | null;
  is_published: boolean | null;
  title: string | null;
  description: string | null;
  photos: unknown;
  region: string | null;
  citq_number: string | null;
  import_raw_data: Record<string, unknown> | null;
};

export function normalizeCitq(v: unknown): string | null {
  return typeof v === "string" && /^[0-9]{6}$/.test(v.trim()) ? v.trim() : null;
}

// Pourquoi une fiche ne peut pas être mise en ligne maintenant (null = elle peut). Mêmes minimums que publish-unclaimed.
export function draftBlocker(l: DraftRow, userId: string, hasActiveSubscription: boolean, citq: string | null): ActivationError | null {
  if (l.host_id !== userId || l.claim_status !== "claimed" || l.mode_publication !== "brouillon" || l.is_published) return "not_eligible";
  const complete =
    (l.title ?? "").trim().length > 0 &&
    (l.description ?? "").trim().length >= 40 &&
    Array.isArray(l.photos) && l.photos.length >= 5 &&
    (l.region ?? "").trim().length > 0;
  if (!complete) return "incomplete";
  if (!citq) return "citq_missing";
  if (!hasActiveSubscription) return "subscription_required";
  return null;
}

function montrealDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// citqs : numéros saisis par le propriétaire (bouton de secours seulement) ; sinon on garde celui de la fiche.
export async function activateClaimedDrafts(
  admin: AdminClient,
  input: { userId: string; listingIds: string[]; citqs?: Record<string, string> }
): Promise<ActivationResult[]> {
  if (input.listingIds.length === 0) return [];
  const [{ data: rows }, { data: subs }] = await Promise.all([
    admin
      .from("listings")
      .select("id, host_id, claim_status, mode_publication, is_published, title, description, photos, region, citq_number, import_raw_data")
      .in("id", input.listingIds),
    admin.from("subscriptions").select("listing_id, status").in("listing_id", input.listingIds),
  ]);
  const byId = new Map<string, DraftRow>(((rows ?? []) as DraftRow[]).map((r) => [r.id, r]));
  const activeSub = new Set<string>(((subs ?? []) as { listing_id: string; status: string }[]).filter((s) => s.status === "active").map((s) => s.listing_id));
  const today = montrealDate();

  const results: ActivationResult[] = [];
  for (const id of input.listingIds) {
    const l = byId.get(id);
    if (!l) {
      results.push({ id, ok: false, error: "not_eligible" });
      continue;
    }
    const citq = normalizeCitq(input.citqs?.[id]) ?? normalizeCitq(l.citq_number);
    const blocker = draftBlocker(l, input.userId, activeSub.has(id), citq);
    if (blocker) {
      results.push({ id, ok: false, error: blocker });
      continue;
    }
    const { data: updated, error } = await admin
      .from("listings")
      .update({
        is_published: true,
        mode_publication: null,
        citq_number: citq,
        unpublished_at: null,
        unpublished_reason: null,
        import_raw_data: { ...(l.import_raw_data ?? {}), active_le: today },
      })
      .eq("id", id)
      .eq("host_id", input.userId)
      .eq("claim_status", "claimed")
      .eq("mode_publication", "brouillon")
      .eq("is_published", false)
      .select("id");
    if (error || !updated || updated.length === 0) {
      if (error) console.error("activateClaimedDrafts: échec", id, error.message);
      results.push({ id, ok: false, error: "failed" });
      continue;
    }
    results.push({ id, ok: true });
  }
  return results;
}
