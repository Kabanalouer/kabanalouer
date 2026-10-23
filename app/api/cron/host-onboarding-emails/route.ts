import { NextRequest, NextResponse } from "next/server";
import { BOOSTS_ENABLED } from "@/lib/featuredConfig";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendBoostInviteEmail, sendDraftReminderEmail, sendProfileTipEmail, sendRoomsTipEmail, sendSmsInviteEmail } from "@/lib/emails/hostOnboarding";
import { sendLaunchOfferEndingNotification } from "@/lib/emails/launchOfferEnding";
import { launchOfferDaysLeft } from "@/lib/launchOffer";

// Cron quotidien — séquence d'accueil des proprios, UNE SEULE FOIS PAR PROPRIO (jamais par chalet), à partir
// de sa première publication ou de sa première revendication. Une annonce ne peut être publiée qu'avec un
// abonnement actif : la date du premier abonnement du proprio sert de date de première publication (aucune
// colonne published_at en base) ; pour une fiche revendiquée on prend aussi listings.claimed_at (utile après
// la fin de l'offre de lancement, quand la revendication ne crée plus d'abonnement). Chaque courriel a sa
// propre fenêtre, sans chevauchement, et n'est envoyé que si le sujet n'est pas déjà réglé (un sujet réglé
// est sauté sans décaler les suivants) :
// - 24 h → 4 jours : photo de profil et présentation (users.profile_tip_email_sent_at), seulement ce qui manque
// - 48 h : invitation à booster (users.boost_invite_email_sent_at) — boosts désactivés pour le lancement
// - 4 → 8 jours : section Chambres (users.rooms_tip_email_sent_at), seulement s'il reste un chalet publié sans chambre
// - 8 → 14 jours : invitation à activer les textos (users.install_app_email_sent_at, nom hérité de l'ancien
//   guide d'installation de l'app) — sautée si le proprio reçoit déjà les textos
// Seulement pour les proprios de moins de 14 jours : les comptes déjà établis ne reçoivent pas ces courriels d'un
// coup au lancement.
// Aussi : rappel « complète ton annonce » pour chaque brouillon jamais publié
// (aucune ligne subscriptions), créé il y a 48 h à 14 jours
// (listings.draft_reminder_sent_at, un seul rappel par brouillon).
// Et : avis à l'admin quand il reste exactement 7 jours à l'offre de
// lancement (lib/launchOffer.ts) — cron quotidien, donc un seul envoi.

const H24 = 24 * 60 * 60 * 1000;
const H48 = 48 * 60 * 60 * 1000;
const H96 = 96 * 60 * 60 * 1000;
const H192 = 192 * 60 * 60 * 1000;
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const now = Date.now();

  let launchOfferReminderSent = false;
  if (launchOfferDaysLeft() === 7) {
    const { error: offerError } = await sendLaunchOfferEndingNotification({ daysLeft: 7 });
    if (offerError) console.error("[host-onboarding-emails] avis fin d'offre de lancement", offerError);
    else launchOfferReminderSent = true;
  }

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("user_id, created_at")
    .order("created_at", { ascending: true });
  if (subsError) {
    console.error("[host-onboarding-emails] lecture subscriptions", subsError);
    return NextResponse.json({ error: "Erreur de lecture." }, { status: 500 });
  }

  // Première publication par proprio
  const firstByUser = new Map<string, number>();
  for (const s of subs ?? []) {
    const uid = s.user_id as string | null;
    if (!uid || firstByUser.has(uid)) continue;
    firstByUser.set(uid, new Date(s.created_at as string).getTime());
  }

  // Première revendication par proprio (fiches importées activées) : la séquence démarre aussi à ce moment
  const { data: claimed } = await supabase
    .from("listings")
    .select("host_id, claimed_at")
    .eq("claim_status", "claimed")
    .not("claimed_at", "is", null);
  for (const c of claimed ?? []) {
    const uid = c.host_id as string | null;
    if (!uid) continue;
    const at = new Date(c.claimed_at as string).getTime();
    const prev = firstByUser.get(uid);
    if (prev === undefined || at < prev) firstByUser.set(uid, at);
  }

  const draftRemindersSent = await sendDraftReminders(supabase, now);

  let boostSent = 0;
  let installSent = 0;
  let profileSent = 0;
  let roomsSent = 0;

  for (const [userId, firstAt] of firstByUser) {
    const age = now - firstAt;
    if (age < H24 || age > WINDOW_MS) continue;

    const { data: user } = await supabase
      .from("users")
      .select("email, name, preferred_language, phone, notify_sms, avatar_url, bio, profile_tip_email_sent_at, rooms_tip_email_sent_at, boost_invite_email_sent_at, install_app_email_sent_at")
      .eq("id", userId)
      .single();
    if (!user?.email) continue;

    const missingPhoto = !(user.avatar_url as string | null)?.trim();
    const missingBio = !(user.bio as string | null)?.trim();
    const needProfile = age < H96 && !user.profile_tip_email_sent_at && (missingPhoto || missingBio);
    const needBoost = BOOSTS_ENABLED && age >= H48 && !user.boost_invite_email_sent_at;
    const needRooms = age >= H96 && age < H192 && !user.rooms_tip_email_sent_at;
    const needInstall = age >= H192 && !user.install_app_email_sent_at;
    if (!needProfile && !needBoost && !needRooms && !needInstall) continue;

    const { data: published } = await supabase
      .from("listings")
      .select("id, title, title_en")
      .eq("host_id", userId)
      .eq("is_published", true)
      .order("created_at", { ascending: true });
    const listing = published?.[0];
    if (!listing) continue; // plus aucune annonce publiée : rien à envoyer

    const lang: "fr" | "en" = user.preferred_language === "en" ? "en" : "fr";
    const firstName = (user.name as string | null)?.split(" ")[0] ?? null;
    const titleOf = (l: { title: string | null; title_en: string | null }) =>
      ((lang === "en" && l.title_en) || l.title || (lang === "en" ? "your cabin" : "ton chalet")) as string;
    const listingTitle = titleOf(listing);

    if (needProfile) {
      const { error } = await sendProfileTipEmail({ email: user.email as string, lang, firstName, missingPhoto, missingBio });
      if (error) console.error(`[host-onboarding-emails] profile-tip ${userId}`, error);
      else {
        await supabase.from("users").update({ profile_tip_email_sent_at: new Date().toISOString() }).eq("id", userId);
        profileSent++;
      }
    }

    if (needBoost) {
      const { error } = await sendBoostInviteEmail({
        email: user.email as string, lang, firstName, listingTitle, listingId: listing.id as string,
      });
      if (error) console.error(`[host-onboarding-emails] boost ${userId}`, error);
      else {
        await supabase.from("users").update({ boost_invite_email_sent_at: new Date().toISOString() }).eq("id", userId);
        boostSent++;
      }
    }

    if (needRooms) {
      // Un chalet publié sans aucune chambre (fiche importée puis revendiquée, surtout) : sinon rien à demander
      const ids = (published ?? []).map((l) => l.id as string);
      const { data: roomRows } = await supabase.from("rooms").select("listing_id").in("listing_id", ids);
      const withRooms = new Set((roomRows ?? []).map((r) => r.listing_id as string));
      const withoutRooms = (published ?? []).filter((l) => !withRooms.has(l.id as string));
      if (withoutRooms.length > 0) {
        const { error } = await sendRoomsTipEmail({
          email: user.email as string, lang, firstName,
          listingTitle: titleOf(withoutRooms[0]), listingId: withoutRooms[0].id as string, otherCount: withoutRooms.length - 1,
        });
        if (error) console.error(`[host-onboarding-emails] rooms-tip ${userId}`, error);
        else {
          await supabase.from("users").update({ rooms_tip_email_sent_at: new Date().toISOString() }).eq("id", userId);
          roomsSent++;
        }
      }
    }

    if (needInstall) {
      const alreadyGetsSms = !!user.phone && user.notify_sms !== false;
      const { error } = alreadyGetsSms
        ? { error: null }
        : await sendSmsInviteEmail({ email: user.email as string, lang, firstName });
      if (error) console.error(`[host-onboarding-emails] sms-invite ${userId}`, error);
      else {
        await supabase.from("users").update({ install_app_email_sent_at: new Date().toISOString() }).eq("id", userId);
        installSent++;
      }
    }
  }

  return NextResponse.json({ ok: true, draftRemindersSent, profileSent, boostSent, roomsSent, installSent, launchOfferReminderSent });
}

async function sendDraftReminders(supabase: ReturnType<typeof adminSupabase>, now: number): Promise<number> {
  const { data: drafts, error } = await supabase
    .from("listings")
    .select("id, host_id, title, title_en, created_at")
    .eq("is_published", false)
    // Jamais pour une fiche non revendiquée (détenue par le compte système), retirée ou de test
    .or("claim_status.is.null,claim_status.eq.claimed")
    .eq("is_test", false)
    .is("draft_reminder_sent_at", null)
    .lte("created_at", new Date(now - H48).toISOString())
    .gte("created_at", new Date(now - WINDOW_MS).toISOString());
  if (error) {
    console.error("[host-onboarding-emails] lecture brouillons", error);
    return 0;
  }

  let sent = 0;
  for (const draft of drafts ?? []) {
    // Déjà publiée un jour (abonnement existant) : c'est une annonce
    // dépubliée, pas un brouillon à terminer — relances win-back à part.
    const { data: sub } = await supabase.from("subscriptions").select("id").eq("listing_id", draft.id).maybeSingle();
    if (sub) continue;

    const { data: user } = await supabase
      .from("users")
      .select("email, name, preferred_language")
      .eq("id", draft.host_id)
      .single();
    if (!user?.email) continue;

    const lang: "fr" | "en" = user.preferred_language === "en" ? "en" : "fr";
    const { error: sendError } = await sendDraftReminderEmail({
      email: user.email as string,
      lang,
      firstName: (user.name as string | null)?.split(" ")[0] ?? null,
      listingTitle: ((lang === "en" && draft.title_en) || draft.title || null) as string | null,
      listingId: draft.id as string,
    });
    if (sendError) {
      console.error(`[host-onboarding-emails] rappel brouillon ${draft.id}`, sendError);
      continue;
    }
    await supabase.from("listings").update({ draft_reminder_sent_at: new Date().toISOString() }).eq("id", draft.id);
    sent++;
  }
  return sent;
}
