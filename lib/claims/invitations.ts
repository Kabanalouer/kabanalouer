import { randomBytes } from "node:crypto";
import { emailContext } from "@/lib/emails/emailContext";
import { claimLink, createClaimToken, removeLink } from "@/lib/claims/tokens";
import { sendClaimInvitationEmail } from "@/lib/emails/claimInvitation";
import { buildListingPath } from "@/lib/listingUrl";

// Invitations à revendiquer, envoyées depuis Admin → Invitations (table listing_invitations).
// Une seule invitation et une seule relance par adresse (clé unique en base). Seules les
// fiches non revendiquées ET publiées sont invitées : le courriel renvoie vers la fiche en ligne.

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const REMINDER_DELAY_DAYS = 5;
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

// Fiches non revendiquées, publiées, qui ne sont pas des fiches de test, avec une adresse
async function unclaimedPublished(admin: AdminClient): Promise<Row[]> {
  return fetchAllRows<Row>((from, to) =>
    admin
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("claim_status", "unclaimed")
      .eq("is_published", true)
      .eq("is_test", false)
      .not("claim_email", "is", null)
      .order("claim_email")
      .range(from, to)
  );
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

// À inviter : adresses avec au moins une fiche non revendiquée publiée et aucune invitation.
// À relancer : invitée il y a 5 jours ou plus, pas revendiquée, pas encore relancée,
// et au moins une fiche toujours non revendiquée et publiée.
export async function listInvitationCandidates(admin: AdminClient, kind: InvitationKind): Promise<InvitationCandidate[]> {
  const rows = await unclaimedPublished(admin);

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
