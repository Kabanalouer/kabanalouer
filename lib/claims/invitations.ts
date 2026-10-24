import { randomBytes } from "node:crypto";
import { emailContext } from "@/lib/emails/emailContext";
import { claimLink, createClaimToken, removeLink } from "@/lib/claims/tokens";
import { sendClaimInvitationEmail } from "@/lib/emails/claimInvitation";
import { buildListingPath } from "@/lib/listingUrl";

// Invitations à revendiquer, envoyées chaque jour par le cron send-invitations ou à la main depuis
// Admin → Invitations (table listing_invitations).
// Une seule invitation et une seule relance par adresse (clé unique en base). Seules les
// fiches non revendiquées ET publiées sont invitées : le courriel renvoie vers la fiche en ligne.

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const REMINDER_DELAY_DAYS = 3;
// Envoi automatique (cron send-invitations) : false = seul l'envoi manuel d'Admin → Invitations reste actif
export const AUTO_INVITATIONS_ENABLED = true;
export type InvitationKind = "invite" | "reminder";

type CandidateListing = {
  id: string;
  title: string | null;
  title_en: string | null;
  region: string | null;
  city: string | null;
  listing_number: number | null;
  custom_slug: string | null;
};

export type InvitationCandidate = {
  claimEmail: string;
  lang: "fr" | "en";
  listings: CandidateListing[];
  // relance seulement : date de l'invitation d'origine
  invitedAt?: string;
};

const LISTING_COLUMNS = "id, title, title_en, region, city, listing_number, custom_slug, claim_email, claim_language";

async function fetchAllRows<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || (data as unknown[]).length < 1000) return rows;
  }
}

type Row = CandidateListing & { claim_email: string; claim_language: string | null };

// Fiches non revendiquées, publiées, qui ne sont pas des fiches de test, avec une adresse.
// testMode (essais seulement, jamais utilisé par le site) : l'inverse — uniquement les
// fiches de test, publiées ou non — pour essayer le parcours sans rien publier.
async function unclaimedPublished(admin: AdminClient, testMode: boolean): Promise<Row[]> {
  return fetchAllRows<Row>((from, to) => {
    let query = admin
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("claim_status", "unclaimed")
      .eq("is_test", testMode)
      .not("claim_email", "is", null);
    if (!testMode) query = query.eq("is_published", true);
    return query.order("claim_email").range(from, to);
  });
}

function group(rows: Row[], only?: Set<string>, exclude?: Set<string>): InvitationCandidate[] {
  const byEmail = new Map<string, Row[]>();
  for (const r of rows) {
    if (only && !only.has(r.claim_email)) continue;
    if (exclude && exclude.has(r.claim_email)) continue;
    byEmail.set(r.claim_email, [...(byEmail.get(r.claim_email) ?? []), r]);
  }
  return [...byEmail.entries()].map(([claimEmail, listings]) => ({
    claimEmail,
    lang: listings[0].claim_language === "en" ? "en" : "fr",
    listings,
  }));
}

// Clés acceptées pour l'adresse du propriétaire dans un lot d'import (mêmes noms que normalizePayload, lib/importQueue.ts).
const PAYLOAD_EMAIL_KEYS = ["claim_email", "courriel", "email", "courriel_contact", "contact_email"];

// Un proprio de plusieurs chalets reçoit UNE SEULE invitation qui les liste tous (règle de Simon, 2026-10-23) :
// adresses (en minuscules) qui ont encore des fiches en cours d'import ou pas encore en ligne — ligne de la
// file d'import en attente, ou fiche non revendiquée non publiée créée dans les dernières 24 h. Avant 10 h
// (heure de Montréal), ces adresses sont exclues de l'envoi : publish-unclaimed (qui envoie dès que tout est
// en ligne, 10 h au plus tard) et send-invitations (rattrapage de 8 h) appliquent la même règle.
// L'envoi manuel d'Admin → Invitations ne l'applique pas : c'est un geste volontaire de l'admin.
export async function emailsStillImporting(admin: AdminClient): Promise<Set<string>> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: queued }, { data: unpublished }] = await Promise.all([
    admin.from("listing_import_queue").select("payload").eq("status", "pending").lt("attempts", 5),
    admin
      .from("listings")
      .select("claim_email")
      .eq("claim_status", "unclaimed")
      .eq("is_published", false)
      .eq("is_test", false)
      .not("claim_email", "is", null)
      .gte("created_at", since),
  ]);
  const emails = new Set<string>();
  for (const r of (queued ?? []) as { payload: unknown }[]) {
    const payload = r.payload && typeof r.payload === "object" ? (r.payload as Record<string, unknown>) : {};
    for (const key of PAYLOAD_EMAIL_KEYS) {
      const v = payload[key];
      if (typeof v === "string" && v.trim()) { emails.add(v.trim().toLowerCase()); break; }
    }
  }
  for (const r of (unpublished ?? []) as { claim_email: string }[]) emails.add(String(r.claim_email).trim().toLowerCase());
  return emails;
}

// Retire des candidats les adresses qui attendent encore des fiches.
export function withoutWaiting(candidates: InvitationCandidate[], waiting: Set<string>): InvitationCandidate[] {
  return waiting.size === 0 ? candidates : candidates.filter((c) => !waiting.has(c.claimEmail.trim().toLowerCase()));
}

// À inviter : adresses avec au moins une fiche non revendiquée publiée et aucune invitation.
// À relancer : invitée il y a REMINDER_DELAY_DAYS jours ou plus, pas revendiquée, pas encore relancée,
// et au moins une fiche toujours non revendiquée et publiée.
// Adresses (en minuscules) d'un propriétaire qui a retiré une de ses fiches (« Retirer ma fiche », claim_status
// 'removed') : on ne lui écrit plus jamais, même si une autre fiche de la même adresse existe ou arrive plus tard
// (règle de Simon, 2026-10-24, après le retrait de la Maison du Cerf). Ni invitation ni relance.
export async function removedOwnerEmails(admin: AdminClient): Promise<Set<string>> {
  const { data } = await admin.from("listings").select("claim_email").eq("claim_status", "removed").not("claim_email", "is", null);
  return new Set<string>(((data ?? []) as { claim_email: string }[]).map((r) => r.claim_email.trim().toLowerCase()));
}

export async function listInvitationCandidates(admin: AdminClient, kind: InvitationKind, testMode = false): Promise<InvitationCandidate[]> {
  const removed = testMode ? new Set<string>() : await removedOwnerEmails(admin);
  const rows = (await unclaimedPublished(admin, testMode)).filter((r) => !removed.has(r.claim_email.trim().toLowerCase()));

  if (kind === "invite") {
    const { data } = await admin.from("listing_invitations").select("claim_email").eq("kind", "invite");
    const invited = new Set<string>((data ?? []).map((r: { claim_email: string }) => r.claim_email));
    return group(rows, undefined, invited);
  }

  const cutoff = new Date(Date.now() - REMINDER_DELAY_DAYS * 86_400_000).toISOString();
  const [{ data: invites }, { data: reminded }] = await Promise.all([
    admin.from("listing_invitations").select("claim_email, sent_at").eq("kind", "invite").is("claimed_at", null).lte("sent_at", cutoff),
    admin.from("listing_invitations").select("claim_email").eq("kind", "reminder"),
  ]);
  const remindedSet = new Set<string>((reminded ?? []).map((r: { claim_email: string }) => r.claim_email));
  const dueAt = new Map<string, string>(
    (invites ?? []).filter((r: { claim_email: string }) => !remindedSet.has(r.claim_email)).map((r: { claim_email: string; sent_at: string }) => [r.claim_email, r.sent_at])
  );
  return group(rows, new Set(dueAt.keys())).map((c) => ({ ...c, invitedAt: dueAt.get(c.claimEmail) }));
}

function titleFor(l: CandidateListing, lang: "fr" | "en"): string {
  return ((lang === "en" ? l.title_en : null) || l.title || (lang === "en" ? "Your listing" : "Votre fiche")) as string;
}

// Aperçu : le même courriel, capturé au lieu d'être envoyé, avec des liens d'exemple
// (aucun jeton créé, aucun pixel de suivi).
export async function previewInvitation(candidate: InvitationCandidate, kind: InvitationKind): Promise<{ subject: string; html: string } | null> {
  let captured: { subject: string; html: string } | null = null;
  await emailContext.run({ capture: (e) => (captured = e) }, () =>
    sendClaimInvitationEmail({
      to: candidate.claimEmail,
      lang: candidate.lang,
      kind,
      listings: candidate.listings.map((l) => ({ title: titleFor(l, candidate.lang), path: buildListingPath(l, candidate.lang) })),
      claimUrl: claimLink(candidate.lang, "apercu"),
      removeLinks: candidate.listings.map((l) => ({ title: titleFor(l, candidate.lang), url: removeLink(candidate.lang, "apercu") })),
    })
  );
  return captured;
}

// Envoie l'invitation ou la relance. La ligne de listing_invitations est créée AVANT
// l'envoi : la clé unique (adresse + type) empêche un double envoi même si deux clics
// arrivent en même temps ('skipped'). Si l'envoi échoue, la ligne est retirée (on peut réessayer).
export async function sendInvitation(admin: AdminClient, candidate: InvitationCandidate, kind: InvitationKind): Promise<"sent" | "skipped" | "error"> {
  const trackToken = randomBytes(16).toString("hex");
  const { data: inserted, error: insertError } = await admin
    .from("listing_invitations")
    .insert({ claim_email: candidate.claimEmail, kind, listing_ids: candidate.listings.map((l) => l.id), track_token: trackToken })
    .select("id")
    .single();
  if (insertError) return insertError.code === "23505" ? "skipped" : "error";

  const undo = async () => {
    await admin.from("listing_invitations").delete().eq("id", inserted.id);
  };

  const reason = `invitation_${kind}`;
  const [claimRaw, ...removeRaws] = await Promise.all([
    createClaimToken(admin, { kind: "claim", claimEmail: candidate.claimEmail, reason }),
    ...candidate.listings.map((l) => createClaimToken(admin, { kind: "remove", claimEmail: candidate.claimEmail, listingId: l.id, reason })),
  ]);
  if (!claimRaw || removeRaws.some((r) => !r)) {
    await undo();
    return "error";
  }

  const { error } = await sendClaimInvitationEmail({
    to: candidate.claimEmail,
    lang: candidate.lang,
    kind,
    listings: candidate.listings.map((l) => ({ title: titleFor(l, candidate.lang), path: buildListingPath(l, candidate.lang) })),
    claimUrl: claimLink(candidate.lang, claimRaw),
    removeLinks: candidate.listings.map((l, i) => ({ title: titleFor(l, candidate.lang), url: removeLink(candidate.lang, removeRaws[i] as string) })),
    trackToken,
  });
  if (error) {
    console.error("sendInvitation: échec d'envoi", candidate.claimEmail, error.message);
    await undo();
    return "error";
  }
  return "sent";
}

// Une revendication marque l'invitation comme réussie (résultats de l'admin)
export async function markInvitationsClaimed(admin: AdminClient, emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const { error } = await admin
    .from("listing_invitations")
    .update({ claimed_at: new Date().toISOString() })
    .in("claim_email", emails)
    .is("claimed_at", null);
  if (error) console.error("markInvitationsClaimed: échec", error.message);
}
