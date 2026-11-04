import { maskEmail } from "@/lib/claims/maskedEmail";
import { markInvitationsClaimed } from "@/lib/claims/invitations";
import { activateClaimedDrafts } from "@/lib/claims/activateDrafts";
import {
  claimLink,
  createClaimToken,
  logOwnerEmail,
  removeLink,
  removeTokenListingIds,
  reportLink,
  type ClaimTokenRow,
} from "@/lib/claims/tokens";
import { sendClaimActivatedEmail, sendClaimAdminAlert, sendClaimWelcomeEmail, sendListingsRemovedNotice, sendUnclaimedRequestEmail } from "@/lib/emails/unclaimedOwner";

// Actions serveur des fiches non revendiquées. Toutes utilisent le client
// service : les colonnes claim_* et les tables de jetons ne sont jamais
// accessibles depuis une session (supabase/add-unclaimed-listings.sql).

type AdminClient = { from: (table: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any; storage: { from: (bucket: string) => any } }; // eslint-disable-line @typescript-eslint/no-explicit-any

type ClaimedRow = { out_listing_id: string; out_claim_email: string | null };

// Transfère les fiches au compte `userId` en une seule transaction (fonction SQL
// claim_listings) : propriétaire, demandes déjà reçues. Ne dépublie jamais rien.
// Puis avertit les anciennes adresses.
export async function claimListingsForUser(
  admin: AdminClient,
  input: { userId: string; listingIds: string[]; tokenId?: string | null; welcome?: boolean; activateDrafts?: boolean }
): Promise<{ ok: true; listingIds: string[]; published: number } | { ok: false; error: string }> {
  const { data, error } = await admin.rpc("claim_listings", {
    p_user_id: input.userId,
    p_listing_ids: input.listingIds,
    p_token_id: input.tokenId ?? null,
  });
  if (error) {
    console.error("claimListingsForUser: échec claim_listings", error);
    return { ok: false, error: error.message ?? "Échec du transfert" };
  }

  const rows = (data ?? []) as ClaimedRow[];

  // Fiches en brouillon : revendiquer les met en ligne tout de suite (le propriétaire n'a rien d'autre à faire). Celles qui
  // ne peuvent pas l'être (fiche à compléter) restent hors ligne : bouton « Activer » dans Mes chalets.
  // Fait AVANT les courriels : la bienvenue dépend de ce qui est réellement en ligne. Ne bloque jamais la revendication.
  let published = 0;
  if (input.activateDrafts) {
    try {
      const claimedIds = rows.map((r) => r.out_listing_id);
      // Même lot : ses fiches de la même adresse qu'il avait déjà revendiquées et qui sont restées hors ligne (brouillon)
      // sont activées avec les autres. `published` ne compte que les fiches revendiquées maintenant (écran de fin).
      const emails = [...new Set(rows.map((r) => r.out_claim_email).filter((e): e is string => !!e))];
      let earlier: string[] = [];
      if (emails.length > 0) {
        const { data: others } = await admin
          .from("listings")
          .select("id")
          .eq("host_id", input.userId)
          .eq("claim_status", "claimed")
          .eq("mode_publication", "brouillon")
          .in("claim_email", emails);
        earlier = ((others ?? []) as { id: string }[]).map((o) => o.id).filter((id) => !claimedIds.includes(id));
      }
      const results = await activateClaimedDrafts(admin, { userId: input.userId, listingIds: [...claimedIds, ...earlier] });
      published = results.filter((r) => r.ok && claimedIds.includes(r.id)).length;
    } catch (e) {
      console.error("claimListingsForUser: échec de la mise en ligne des brouillons", e);
    }
  }

  try {
    // L'invitation envoyée à cette adresse est marquée « revendiquée » (résultats de l'admin)
    await markInvitationsClaimed(admin, [...new Set(rows.map((r) => r.out_claim_email).filter((e): e is string => !!e))]);
    await notifyOldAddresses(admin, input.userId, rows);
    if (input.welcome !== false) await welcomeNewOwner(admin, input.userId, rows.map((r) => r.out_listing_id));
  } catch (e) {
    // La revendication a réussi : l'avis à l'ancienne adresse ne doit jamais la défaire.
    console.error("claimListingsForUser: échec de l'avis à l'ancienne adresse", e);
  }
  return { ok: true, listingIds: rows.map((r) => r.out_listing_id), published };
}

// Un seul courriel de bienvenue par revendication, même pour plusieurs fiches.
async function welcomeNewOwner(admin: AdminClient, userId: string, listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return;
  const [{ data: user }, { data: listings }] = await Promise.all([
    admin.from("users").select("email, name, preferred_language").eq("id", userId).maybeSingle(),
    admin.from("listings").select("title, title_en, mode_publication").in("id", listingIds),
  ]);
  if (!user?.email) return;
  const lang: "fr" | "en" = user.preferred_language === "en" ? "en" : "fr";
  // Au moins une fiche en brouillon : « elles sont à vous, activez-les depuis Mes chalets »
  const draft = (listings ?? []).some((l: { mode_publication: string | null }) => l.mode_publication === "brouillon");
  const titles = (listings ?? []).map((l: { title: string | null; title_en: string | null }) =>
    (lang === "en" ? l.title_en : null) || l.title || (lang === "en" ? "Your listing" : "Votre fiche")
  );
  const { error } = await sendClaimWelcomeEmail({
    to: user.email as string,
    lang,
    firstName: ((user.name as string | null) ?? "").split(" ")[0],
    listingTitles: titles,
    draft,
  });
  if (error) console.error("welcomeNewOwner: échec envoi", error);
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

// « Retirer mes fiches » : chaque fiche choisie est dépubliée et marquée 'removed', son CITQ et son adresse d'origine
// vont dans import_exclusions pour qu'elle ne soit plus jamais réimportée, puis ses photos et ses textes sont supprimés.
// Un jeton couvre toutes les fiches de l'adresse (token.listing_ids) : le propriétaire en choisit certaines, les autres
// restent intactes et le jeton reste valable ; il n'est consommé que lorsqu'il ne reste plus aucune fiche à retirer.
// Un seul avis à Simon pour toute la demande.
type RemovableRow = {
  id: string;
  host_id: string | null;
  title: string | null;
  claim_email: string | null;
  claim_status: string | null;
  citq_number: string | null;
  import_source_url: string | null;
};

export async function removeUnclaimedListings(
  admin: AdminClient,
  token: ClaimTokenRow,
  listingIds: string[]
): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  const covered = removeTokenListingIds(token);
  const wanted = listingIds.filter((id) => covered.includes(id));
  if (wanted.length === 0) return { ok: false, error: "Jeton invalide" };

  const { data: rows } = await admin
    .from("listings")
    .select("id, host_id, title, claim_email, claim_status, citq_number, import_source_url")
    .in("id", wanted);
  // La fiche doit être toujours non revendiquée et porter l'adresse du jeton
  const email = token.claim_email.trim().toLowerCase();
  const listings = ((rows ?? []) as RemovableRow[]).filter(
    (l) => l.claim_status === "unclaimed" && (l.claim_email ?? "").trim().toLowerCase() === email
  );
  if (listings.length === 0) return { ok: false, error: "Fiche indisponible" };

  const removed: { title: string; photosRemoved: number; titleKept: boolean }[] = [];
  for (const listing of listings) {
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
      console.error("removeUnclaimedListings: échec", error);
      continue;
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
        console.error("removeUnclaimedListings: échec import_exclusions", exclusionError);
      }
    }

    // Retrait complet : photos et textes supprimés du serveur (jamais bloquant pour le propriétaire)
    const purge = await purgeRemovedListing(admin, listing).catch((e) => {
      console.error("removeUnclaimedListings: purge", e);
      return { photosRemoved: 0, titleKept: false };
    });
    removed.push({ title: listing.title ?? "(sans titre)", photosRemoved: purge.photosRemoved, titleKept: purge.titleKept });
  }
  if (removed.length === 0) return { ok: false, error: "Échec du retrait" };

  // Le jeton reste valable tant qu'une de ses fiches peut encore être retirée
  const { count: remaining } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .in("id", covered)
    .eq("claim_status", "unclaimed");
  if ((remaining ?? 0) === 0) await admin.from("listing_claim_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);

  await sendListingsRemovedNotice({ claimEmail: token.claim_email, listings: removed });
  return { ok: true, removed: removed.length };
}

// Règle de Simon (2026-10-24) : quand un propriétaire retire sa fiche, on supprime ses photos (fichiers du
// stockage : plus aucun lien direct) et ses textes. On garde seulement de quoi ne plus jamais lui écrire ni
// réimporter la fiche : claim_email, claim_status 'removed', adresse d'origine, CITQ (voir CLAUDE.md). Le titre est
// gardé seulement si des voyageurs ont déjà écrit sur cette fiche (la messagerie en a besoin).
async function purgeRemovedListing(
  admin: AdminClient,
  listing: { id: string; host_id: string | null; import_source_url: string | null }
): Promise<{ photosRemoved: number; titleKept: boolean }> {
  const { count: messageCount } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("listing_id", listing.id);
  const titleKept = (messageCount ?? 0) > 0;

  let photosRemoved = 0;
  if (listing.host_id) {
    const folder = `${listing.host_id}/${listing.id}`;
    const bucket = admin.storage.from("listing-photos");
    const { data: files } = await bucket.list(folder, { limit: 1000 });
    const paths = ((files ?? []) as { name: string }[]).map((f) => `${folder}/${f.name}`);
    if (paths.length > 0) {
      const { data: removed, error } = await bucket.remove(paths);
      if (error) console.error("purgeRemovedListing: suppression des photos", error);
      else photosRemoved = (removed ?? []).length;
    }
  }

  const { error } = await admin
    .from("listings")
    .update({
      ...(titleKept ? {} : { title: null, title_en: null }),
      description: null, description_en: null,
      photos: [], amenities: [], amenities_en: null, nearby_activities: [], nearby_activities_en: null,
      address: null, latitude: null, longitude: null, city: null, region: null,
      price_low: null, price_high: null, price_peak: null,
      custom_slug: null, previous_custom_slug: null, slug_fr: null, slug_en: null,
      import_raw_data: { retiree: true, retiree_le: new Date().toISOString().slice(0, 10), raison: "Le propriétaire a demandé le retrait de sa fiche" },
    })
    .eq("id", listing.id)
    .eq("claim_status", "removed");
  if (error) console.error("purgeRemovedListing: vidage de la fiche", error);

  if (listing.import_source_url) {
    // La ligne reste (l'adresse d'origine ne peut pas être remise en file), son contenu part
    await admin
      .from("listing_import_queue")
      .update({ payload: { retiree: true, raison: "Le propriétaire a demandé le retrait de sa fiche" } })
      .eq("import_source_url", listing.import_source_url);
  }
  return { photosRemoved, titleKept };
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
// par conversation, SANS plafond (décision de Simon, 2026-10-19 : chaque demande de voyageur
// est transmise ; le voyageur est déjà limité par /api/messages). 'retry' : échec passager,
// le message reste en attente. 'skipped' : aucune adresse connue (rien à envoyer, la demande
// attend la revendication).
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
