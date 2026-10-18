import { isLaunchOfferActive } from "@/lib/launchOffer";
import { maskEmail } from "@/lib/claims/maskedEmail";
import {
  canSendMessageEmail,
  claimLink,
  createClaimToken,
  logOwnerEmail,
  removeLink,
  reportLink,
  type ClaimTokenRow,
} from "@/lib/claims/tokens";
import { sendClaimActivatedEmail, sendClaimAdminAlert, sendUnclaimedRequestEmail } from "@/lib/emails/unclaimedOwner";

// Actions serveur des fiches non revendiquées. Toutes utilisent le client
// service : les colonnes claim_* et les tables de jetons ne sont jamais
// accessibles depuis une session (supabase/add-unclaimed-listings.sql).

type AdminClient = { from: (table: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

type ClaimedRow = { out_listing_id: string; out_claim_email: string | null };

// Transfère les fiches au compte `userId` en une seule transaction (fonction SQL
// claim_listings) : propriétaire, demandes déjà reçues, abonnement gratuit tant que
// l'offre de lancement est active (lib/launchOffer.ts). Ne dépublie jamais rien.
// Puis avertit les anciennes adresses.
export async function claimListingsForUser(
  admin: AdminClient,
  input: { userId: string; listingIds: string[]; tokenId?: string | null }
): Promise<{ ok: true; listingIds: string[] } | { ok: false; error: string }> {
  let freeUntil: string | null = null;
  if (isLaunchOfferActive()) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    freeUntil = d.toISOString();
  }

  const { data, error } = await admin.rpc("claim_listings", {
    p_user_id: input.userId,
    p_listing_ids: input.listingIds,
    p_token_id: input.tokenId ?? null,
    p_free_launch_expires_at: freeUntil,
  });
  if (error) {
    console.error("claimListingsForUser: échec claim_listings", error);
    return { ok: false, error: error.message ?? "Échec du transfert" };
  }

  const rows = (data ?? []) as ClaimedRow[];
  try {
    await notifyOldAddresses(admin, input.userId, rows);
  } catch (e) {
    // La revendication a réussi : l'avis à l'ancienne adresse ne doit jamais la défaire.
    console.error("claimListingsForUser: échec de l'avis à l'ancienne adresse", e);
  }
  return { ok: true, listingIds: rows.map((r) => r.out_listing_id) };
}

// « Votre fiche a été activée par le compte j…@gmail.com », un courriel par
// ancienne adresse (même si elle couvre plusieurs fiches), avec un lien pour signaler un problème.
async function notifyOldAddresses(admin: AdminClient, userId: string, rows: ClaimedRow[]): Promise<void> {
  const byEmail = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.out_claim_email) continue;
    byEmail.set(r.out_claim_email, [...(byEmail.get(r.out_claim_email) ?? []), r.out_listing_id]);
  }
  if (byEmail.size === 0) return;

  const { data: user } = await admin.from("users").select("email").eq("id", userId).maybeSingle();
  const claimant = maskEmail((user?.email as string | undefined) ?? "");

  for (const [email, ids] of byEmail) {
    const { data: listings } = await admin
      .from("listings")
      .select("id, title, title_en, claim_language")
      .in("id", ids);
    const lang: "fr" | "en" = listings?.[0]?.claim_language === "en" ? "en" : "fr";
    const titles = (listings ?? []).map((l: { title: string | null; title_en: string | null }) =>
      (lang === "en" ? l.title_en : null) || l.title || (lang === "en" ? "Your listing" : "Votre fiche")
    );
    const raw = await createClaimToken(admin, { kind: "dispute", claimEmail: email, listingIds: ids, reason: "activation_notice" });
    if (!raw) continue;
    const { error } = await sendClaimActivatedEmail({
      to: email,
      lang,
      listingTitles: titles,
      maskedClaimant: claimant,
      reportUrl: reportLink(lang, raw),
    });
    if (error) console.error("notifyOldAddresses: échec envoi", error);
    else await logOwnerEmail(admin, { claimEmail: email, listingId: ids[0], kind: "activation_notice" });
  }
}

// « Retirer ma fiche » : la fiche est dépubliée et marquée 'removed', son
// CITQ et son adresse d'origine vont dans import_exclusions pour qu'elle ne
// soit plus jamais réimportée, et le jeton est consommé.
export async function removeUnclaimedListing(
  admin: AdminClient,
  token: ClaimTokenRow
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token.listing_id) return { ok: false, error: "Jeton invalide" };

  const { data: listing } = await admin
    .from("listings")
    .select("id, claim_status, citq_number, import_source_url")
    .eq("id", token.listing_id)
    .maybeSingle();
  if (!listing || listing.claim_status !== "unclaimed") return { ok: false, error: "Fiche indisponible" };

  const { error } = await admin
    .from("listings")
    .update({
      claim_status: "removed",
      is_published: false,
      unpublished_at: new Date().toISOString(),
      unpublished_reason: "removed",
    })
    .eq("id", listing.id)
    .eq("claim_status", "unclaimed");
  if (error) {
    console.error("removeUnclaimedListing: échec", error);
    return { ok: false, error: "Échec du retrait" };
  }

  if (listing.citq_number || listing.import_source_url) {
    // Clé unique sur une expression (coalesce) : un upsert ne peut pas la cibler,
    // on insère et on ignore le doublon (23505).
    const { error: exclusionError } = await admin.from("import_exclusions").insert({
      citq_number: listing.citq_number ?? null,
      import_source_url: listing.import_source_url ?? null,
      reason: "removed_by_owner",
    });
    if (exclusionError && exclusionError.code !== "23505") {
      console.error("removeUnclaimedListing: échec import_exclusions", exclusionError);
    }
  }
  await admin.from("listing_claim_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);
  return { ok: true };
}

// « Signaler un problème » après une activation : une demande par fiche dans la
// file d'administration (aucun retour automatique), alerte immédiate à l'équipe.
export async function reportClaimProblem(
  admin: AdminClient,
  token: ClaimTokenRow,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = token.listing_ids ?? [];
  if (ids.length === 0) return { ok: false, error: "Jeton invalide" };

  const { data: listings } = await admin.from("listings").select("id, title").in("id", ids);
  const rows = ids.map((id) => ({
    kind: "dispute",
    listing_id: id,
    contact_email: token.claim_email,
    message: message.slice(0, 5000),
  }));
  const { error } = await admin.from("claim_requests").insert(rows);
  if (error) {
    console.error("reportClaimProblem: échec", error);
    return { ok: false, error: "Échec de l'envoi" };
  }
  await admin.from("listing_claim_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);

  const titles = (listings ?? []).map((l: { title: string | null }) => l.title ?? "(sans titre)").join(", ");
  await sendClaimAdminAlert({ kind: "dispute", listingTitle: titles, listingId: ids[0], from: token.claim_email, message });
  return { ok: true };
}

// Demande d'un voyageur sur une fiche non revendiquée : transmise par courriel à
// claim_email avec un lien d'activation et un lien « Retirer ma fiche ». Un courriel
// par conversation, au plus 3 par jour par fiche ET par adresse (toutes fiches
// confondues) — au-delà, 'retry' : le message reste en attente et repart le lendemain.
// 'skipped' : aucune adresse connue (rien à envoyer, la demande attend la revendication).
export async function notifyUnclaimedOwner(
  admin: AdminClient,
  input: {
    listingId: string;
    claimEmail: string | null;
    claimLanguage: "fr" | "en";
    listingTitle: string;
    senderFirstName: string;
    messageText: string;
    translated: boolean;
  }
): Promise<"sent" | "retry" | "skipped"> {
  if (!input.claimEmail) return "skipped";
  if (!(await canSendMessageEmail(admin, input.listingId, input.claimEmail))) return "retry";

  const [claimRaw, removeRaw] = await Promise.all([
    createClaimToken(admin, { kind: "claim", claimEmail: input.claimEmail, reason: "traveler_message" }),
    createClaimToken(admin, { kind: "remove", claimEmail: input.claimEmail, listingId: input.listingId, reason: "traveler_message" }),
  ]);
  if (!claimRaw || !removeRaw) return "retry";

  const { error } = await sendUnclaimedRequestEmail({
    to: input.claimEmail,
    lang: input.claimLanguage,
    listingTitle: input.listingTitle,
    senderFirstName: input.senderFirstName,
    messageText: input.messageText,
    translated: input.translated,
    claimUrl: claimLink(input.claimLanguage, claimRaw),
    removeUrl: removeLink(input.claimLanguage, removeRaw),
  });
  if (error) {
    console.error("notifyUnclaimedOwner: échec envoi", error);
    return "retry";
  }
  await logOwnerEmail(admin, { claimEmail: input.claimEmail, listingId: input.listingId, kind: "message" });
  return "sent";
}
