import { emailsWithPendingImport, fetchAllRows, listDraftCandidates, removedOwnerEmails } from "@/lib/claims/invitations";
import { loadDraftNotes } from "@/lib/claims/draftNotes";
import { normalizePhotos } from "@/lib/photo";

// Données de la table d'Admin → Brouillons : une ligne par propriétaire de fiches en brouillon, avec ses fiches, l'état de
// l'import, ce qui a été envoyé et la relance éventuellement due. Les envois eux-mêmes sont faits à la main (route
// /api/admin/draft-invitations) : rien ne part sans le clic d'un admin. Ce fichier ne fait que lire.

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DraftReminderKind = "draft_reminder_3" | "draft_reminder_10";
export type DraftOwnerStatus = "import" | "sans_fiche" | "pret" | "invite" | "revendique" | "actif" | "retire";

export type SentInfo = { sentAt: string; openedAt: string | null; claimedAt: string | null };

export type DraftOwnerListing = {
  id: string;
  title: string;
  city: string | null;
  region: string | null;
  photoCount: number;
  photoUrl: string | null;
  // Ce qui empêcherait la mise en ligne à la revendication (mêmes minimums que lib/claims/activateDrafts.ts)
  issues: string[];
  state: "brouillon" | "revendiquee" | "en_ligne";
};

export type DraftOwnerRow = {
  email: string;
  lang: "fr" | "en";
  siteUrl: string | null;
  displayName: string;
  introFr: string;
  introEn: string;
  customSubject: string;
  customGreeting: string;
  customHeading: string;
  customBody: string;
  listings: DraftOwnerListing[];
  pendingImports: number;
  rejectedImports: number;
  // Lignes de la file toujours « en attente » mais épuisées (5 essais ratés) : l'import ne se fera pas tout seul
  stuckImports: number;
  invite: SentInfo | null;
  reminder3: SentInfo | null;
  reminder10: SentInfo | null;
  status: DraftOwnerStatus;
  due: DraftReminderKind | null;
  // Retiré des envois par un admin (bouton « Retirer ») : aucune invitation ni relance, « Rétablir » possible
  stopped: boolean;
};

type ListingRow = {
  id: string;
  title: string | null;
  title_en: string | null;
  city: string | null;
  region: string | null;
  photos: unknown;
  description: string | null;
  citq_number: string | null;
  claim_email: string;
  claim_language: string | null;
  claim_status: string | null;
  is_published: boolean | null;
  mode_publication: string | null;
  import_raw_data: Record<string, unknown> | null;
};

const LISTING_SELECT =
  "id, title, title_en, city, region, photos, description, citq_number, claim_email, claim_language, claim_status, is_published, mode_publication, import_raw_data";

// Pourquoi une fiche ne se mettrait pas en ligne toute seule à la revendication (liste vide = prête)
export function listingIssues(l: { title: string | null; description: string | null; photos: unknown; region: string | null; citq_number: string | null }): string[] {
  const issues: string[] = [];
  if (!(l.title ?? "").trim()) issues.push("titre manquant");
  if ((l.description ?? "").trim().length < 40) issues.push("description trop courte");
  const photos = Array.isArray(l.photos) ? l.photos.length : 0;
  if (photos < 5) issues.push(`${photos} photo${photos > 1 ? "s" : ""} (5 minimum)`);
  if (!(l.region ?? "").trim()) issues.push("région manquante");
  return issues;
}

export function deriveStatus(input: {
  removed: boolean;
  listingCount: number;
  pendingImports: number;
  rejectedImports?: number;
  stuckImports?: number;
  invited: boolean;
  anyActive: boolean;
  anyClaimed: boolean;
}): DraftOwnerStatus {
  if (input.removed) return "retire";
  if (input.anyActive) return "actif";
  if (input.invited) return input.anyClaimed ? "revendique" : "invite";
  if (input.pendingImports > 0) return "import";
  // Plus rien à importer et aucune fiche : tout a été refusé, retiré ou n'a pas marché (pas un import en cours)
  if (input.listingCount === 0) return (input.rejectedImports ?? 0) > 0 || (input.stuckImports ?? 0) > 0 ? "sans_fiche" : "import";
  return "pret";
}

const PAYLOAD_EMAIL_KEYS = ["claim_email", "courriel", "email", "courriel_contact", "contact_email"];

function payloadEmail(payload: unknown): string | null {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  for (const key of PAYLOAD_EMAIL_KEYS) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase();
  }
  return null;
}

function isDraftPayload(payload: unknown): boolean {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return typeof p.mode_publication === "string" && p.mode_publication.trim().toLowerCase() === "brouillon";
}

export async function listDraftOwners(admin: AdminClient): Promise<DraftOwnerRow[]> {
  // Chaque lecture passe par tranches de 1000 (limite d'une requête Supabase) avec un tri complet par id : sans cela, les
  // fiches au-delà de la 1000ᵉ (par ordre de titre) manquaient et leur propriétaire s'affichait « sans fiche ».
  const [draftData, activeData, inviteData, queueData, notes, removed, due3, due10, stillWaiting] = await Promise.all([
    fetchAllRows<ListingRow>((from, to) =>
      admin.from("listings").select(LISTING_SELECT).eq("mode_publication", "brouillon").eq("is_test", false).not("claim_email", "is", null).order("title").order("id").range(from, to)
    ),
    fetchAllRows<ListingRow>((from, to) =>
      admin.from("listings").select(LISTING_SELECT).not("import_raw_data->>active_le", "is", null).eq("is_test", false).not("claim_email", "is", null).order("id").range(from, to)
    ),
    fetchAllRows<{ claim_email: string; kind: string; sent_at: string; opened_at: string | null; claimed_at: string | null }>((from, to) =>
      admin
        .from("listing_invitations")
        .select("claim_email, kind, sent_at, opened_at, claimed_at")
        .in("kind", ["draft_invite", "draft_reminder_3", "draft_reminder_10"])
        .order("claim_email")
        .order("kind")
        .range(from, to)
    ),
    // Seuls le mode et les adresses du lot sont lus (pas les photos du lot) : les lignes refusées s'accumulent
    fetchAllRows<{ status: string; mode: string | null; e1: string | null; e2: string | null; e3: string | null; e4: string | null; e5: string | null }>((from, to) =>
      admin
        .from("listing_import_queue")
        .select("status, mode:payload->>mode_publication, e1:payload->>claim_email, e2:payload->>courriel, e3:payload->>email, e4:payload->>courriel_contact, e5:payload->>contact_email")
        .in("status", ["pending", "rejected"])
        .order("id")
        .range(from, to)
    ).then((rows) =>
      rows.map((r) => ({
        status: r.status,
        payload: { mode_publication: r.mode, claim_email: r.e1, courriel: r.e2, email: r.e3, courriel_contact: r.e4, contact_email: r.e5 },
      }))
    ),
    loadDraftNotes(admin),
    removedOwnerEmails(admin),
    listDraftCandidates(admin, "draft_reminder_3"),
    listDraftCandidates(admin, "draft_reminder_10"),
    // La règle d'envoi réelle (moins de 5 essais) : une ligne épuisée ne retient plus l'invitation
    emailsWithPendingImport(admin),
  ]);

  const invites = (inviteData ?? []) as { claim_email: string; kind: string; sent_at: string; opened_at: string | null; claimed_at: string | null }[];
  const invitedEmails = new Set(invites.map((i) => i.claim_email.trim().toLowerCase()));

  // Fiches : brouillons + fiches déjà activées des adresses invitées (pour montrer « en ligne »)
  const rows = new Map<string, ListingRow>();
  for (const r of (draftData ?? []) as ListingRow[]) rows.set(r.id, r);
  for (const r of (activeData ?? []) as ListingRow[]) {
    if (invitedEmails.has(r.claim_email.trim().toLowerCase())) rows.set(r.id, r);
  }

  const queued = ((queueData ?? []) as { status: string; payload: unknown }[]).filter((q) => isDraftPayload(q.payload));
  const pendingBy = new Map<string, number>();
  const rejectedBy = new Map<string, number>();
  for (const q of queued) {
    const email = payloadEmail(q.payload);
    if (!email) continue;
    const m = q.status === "pending" ? pendingBy : rejectedBy;
    m.set(email, (m.get(email) ?? 0) + 1);
  }

  const emails = new Set<string>([...invitedEmails, ...notes.keys(), ...pendingBy.keys(), ...rejectedBy.keys()]);
  for (const r of rows.values()) emails.add(r.claim_email.trim().toLowerCase());

  const dueBy = new Map<string, DraftReminderKind>();
  for (const c of due10) dueBy.set(c.claimEmail.trim().toLowerCase(), "draft_reminder_10");
  for (const c of due3) if (!dueBy.has(c.claimEmail.trim().toLowerCase())) dueBy.set(c.claimEmail.trim().toLowerCase(), "draft_reminder_3");

  const out: DraftOwnerRow[] = [];
  for (const email of emails) {
    const mine = [...rows.values()].filter((r) => r.claim_email.trim().toLowerCase() === email);
    const listings: DraftOwnerListing[] = mine.map((r) => {
      const active = !!r.import_raw_data?.active_le || (r.is_published === true && r.mode_publication == null);
      return {
        id: r.id,
        title: (r.title ?? "").trim() || "(sans titre)",
        city: r.city,
        region: r.region,
        photoCount: Array.isArray(r.photos) ? r.photos.length : 0,
        photoUrl: normalizePhotos(r.photos)[0]?.url ?? null,
        issues: active ? [] : listingIssues(r),
        state: active ? "en_ligne" : r.claim_status === "claimed" ? "revendiquee" : "brouillon",
      };
    });
    const sent = (kind: string): SentInfo | null => {
      const i = invites.find((x) => x.claim_email.trim().toLowerCase() === email && x.kind === kind);
      return i ? { sentAt: i.sent_at, openedAt: i.opened_at, claimedAt: i.claimed_at } : null;
    };
    const note = notes.get(email);
    const invite = sent("draft_invite");
    const pendingImports = stillWaiting.has(email) ? (pendingBy.get(email) ?? 1) : 0;
    const stuckImports = stillWaiting.has(email) ? 0 : (pendingBy.get(email) ?? 0);
    out.push({
      email,
      lang: mine[0]?.claim_language === "en" ? "en" : "fr",
      siteUrl: note?.site_url ?? null,
      displayName: note?.display_name ?? "",
      introFr: note?.intro_fr ?? "",
      introEn: note?.intro_en ?? "",
      customSubject: note?.custom_subject ?? "",
      customGreeting: note?.custom_greeting ?? "",
      customHeading: note?.custom_heading ?? "",
      customBody: note?.custom_body ?? "",
      listings,
      pendingImports,
      rejectedImports: rejectedBy.get(email) ?? 0,
      stuckImports,
      invite,
      reminder3: sent("draft_reminder_3"),
      reminder10: sent("draft_reminder_10"),
      status: deriveStatus({
        removed: removed.has(email) || !!note?.contact_stopped_at,
        listingCount: listings.length,
        pendingImports,
        rejectedImports: rejectedBy.get(email) ?? 0,
        stuckImports,
        invited: !!invite,
        anyActive: listings.some((l) => l.state === "en_ligne"),
        anyClaimed: listings.some((l) => l.state !== "brouillon"),
      }),
      due: dueBy.get(email) ?? null,
      stopped: !!note?.contact_stopped_at,
    });
  }

  const rank: Record<DraftOwnerStatus, number> = { pret: 1, import: 2, sans_fiche: 3, invite: 4, revendique: 5, actif: 6, retire: 7 };
  return out.sort((a, b) => (a.due ? 0 : 1) - (b.due ? 0 : 1) || rank[a.status] - rank[b.status] || a.email.localeCompare(b.email));
}
