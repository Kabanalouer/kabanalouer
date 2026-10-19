import { createHash, randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/siteUrl";

// Jetons des fiches non revendiquées (table listing_claim_tokens, voir
// supabase/add-unclaimed-listings.sql). Le jeton en clair n'existe que dans le
// lien du courriel : la base ne garde que son empreinte SHA-256.

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const CLAIM_TOKEN_TTL_DAYS = 30;
// 32 octets en base64url = 43 caractères
const RAW_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export type ClaimTokenKind = "claim" | "remove" | "dispute";

export type ClaimTokenRow = {
  id: string;
  kind: ClaimTokenKind;
  claim_email: string;
  listing_id: string | null;
  listing_ids: string[] | null;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Crée un jeton et renvoie sa valeur en clair (à mettre dans le lien, jamais ailleurs).
// claim : couvre toutes les fiches non revendiquées du même claim_email, expire.
// remove : une fiche (« Retirer ma fiche »), sans expiration. dispute : « Signaler un problème ».
export async function createClaimToken(
  admin: AdminClient,
  input: { kind: ClaimTokenKind; claimEmail: string; listingId?: string; listingIds?: string[]; reason: string }
): Promise<string | null> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt =
    input.kind === "claim" ? new Date(Date.now() + CLAIM_TOKEN_TTL_DAYS * 86_400_000).toISOString() : null;
  const { error } = await admin.from("listing_claim_tokens").insert({
    token_hash: hashToken(raw),
    kind: input.kind,
    claim_email: input.claimEmail,
    listing_id: input.listingId ?? null,
    listing_ids: input.listingIds ?? null,
    expires_at: expiresAt,
    created_reason: input.reason,
  });
  if (error) {
    console.error("createClaimToken: échec", error);
    return null;
  }
  return raw;
}

export type TokenLookup =
  | { status: "ok"; token: ClaimTokenRow }
  | { status: "invalid" | "used" | "expired" };

export async function findClaimToken(admin: AdminClient, raw: string, kind: ClaimTokenKind): Promise<TokenLookup> {
  if (!RAW_TOKEN_RE.test(raw)) return { status: "invalid" };
  const { data } = await admin
    .from("listing_claim_tokens")
    .select("id, kind, claim_email, listing_id, listing_ids, expires_at, used_at, revoked_at")
    .eq("token_hash", hashToken(raw))
    .eq("kind", kind)
    .maybeSingle();
  if (!data || data.revoked_at) return { status: "invalid" };
  if (data.used_at) return { status: "used" };
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return { status: "expired" };
  return { status: "ok", token: data as ClaimTokenRow };
}

// Liens des courriels : /revendiquer/… en français, /en/claim/… en anglais.
const PATHS = {
  claim: { fr: "/revendiquer/", en: "/en/claim/" },
  remove: { fr: "/retirer/", en: "/en/remove/" },
  report: { fr: "/signaler/", en: "/en/report/" },
} as const;

export function claimLink(locale: "fr" | "en", raw: string): string {
  return `${SITE_URL}${PATHS.claim[locale]}${raw}`;
}
export function removeLink(locale: "fr" | "en", raw: string): string {
  return `${SITE_URL}${PATHS.remove[locale]}${raw}`;
}
export function reportLink(locale: "fr" | "en", raw: string): string {
  return `${SITE_URL}${PATHS.report[locale]}${raw}`;
}

// Plafonds du bouton public « Envoyer le lien » (claim_email_log) : 3 demandes par jour par
// fiche, 5 par adresse. Les courriels « un voyageur s'intéresse » n'ont AUCUN plafond
// (décision de Simon, 2026-10-19).
export const MAX_LINK_EMAILS_PER_LISTING_PER_DAY = 3;
export const MAX_LINK_EMAILS_PER_ADDRESS_PER_DAY = 5;

export type OwnerEmailKind = "message" | "link" | "link_request" | "activation_notice";

async function countSince(admin: AdminClient, column: "listing_id" | "claim_email", value: string, kind: OwnerEmailKind): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("claim_email_log")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("kind", kind)
    .gte("created_at", since);
  return count ?? 0;
}

export async function canSendLinkEmail(admin: AdminClient, listingId: string, claimEmail: string): Promise<boolean> {
  const [perListing, perAddress] = await Promise.all([
    countSince(admin, "listing_id", listingId, "link_request"),
    countSince(admin, "claim_email", claimEmail, "link_request"),
  ]);
  return perListing < MAX_LINK_EMAILS_PER_LISTING_PER_DAY && perAddress < MAX_LINK_EMAILS_PER_ADDRESS_PER_DAY;
}

export async function logOwnerEmail(
  admin: AdminClient,
  input: { claimEmail: string; listingId: string | null; kind: OwnerEmailKind }
): Promise<void> {
  const { error } = await admin
    .from("claim_email_log")
    .insert({ claim_email: input.claimEmail, listing_id: input.listingId, kind: input.kind });
  if (error) console.error("logOwnerEmail: échec", error);
}
