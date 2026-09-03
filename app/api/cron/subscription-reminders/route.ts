import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  sendSubscriptionReminderEmail,
  sendAutoRenewalReminderEmail,
  sendPaymentFailedEmail,
  type ReminderThreshold,
} from "@/lib/emails/subscriptionReminder";
import { sendWinbackReminderEmail, type WinbackThreshold } from "@/lib/emails/winbackReminder";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Séquence à 3 seuils — offre de lancement uniquement (renouvellement actif requis).
const RENEWAL_THRESHOLDS: { days: ReminderThreshold; column: "reminder_30d_sent" | "reminder_10d_sent" | "reminder_3d_sent" }[] = [
  { days: 30, column: "reminder_30d_sent" },
  { days: 10, column: "reminder_10d_sent" },
  { days: 3, column: "reminder_3d_sent" },
];

const WINBACK_THRESHOLDS: { days: WinbackThreshold; column: "reminder_winback_3d_sent" | "reminder_winback_14d_sent" }[] = [
  { days: 3, column: "reminder_winback_3d_sent" },
  { days: 14, column: "reminder_winback_14d_sent" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// GET — appelé par le cron Vercel (une fois par jour). Chaque ligne subscriptions
// correspond désormais à UNE annonce (listing_id) — plus à un proprio entier.
// - status = 'past_due' : un seul email informatif dès détecté.
// - status = 'active' + is_free_launch = true : séquence 30j/10j/3j, renouvellement actif requis.
// - status = 'active' + is_free_launch = false : un seul rappel informatif à 30j (Stripe renouvelle automatiquement).
// - status = 'canceled' OU offre de lancement expirée : dépublication de CETTE annonce précise.
// - annonce dépubliée pour raison d'abonnement : séquence de retour (win-back) 3j/14j, par annonce.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const windowEnd = new Date(Date.now() + 31 * DAY_MS).toISOString();

  // Les abonnements past_due n'ont pas de contrainte de fenêtre d'expiration —
  // on les inclut peu importe expires_at, contrairement aux actifs.
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select(
      "id, listing_id, user_id, status, expires_at, is_free_launch, price_cents, reminder_30d_sent, reminder_10d_sent, reminder_3d_sent, reminder_auto_renewal_sent, reminder_past_due_sent, reminder_cycle_expires_at, listings(title)"
    )
    .not("expires_at", "is", null)
    .or(`and(status.eq.active,expires_at.lte.${windowEnd}),status.eq.past_due`);

  if (error) {
    console.error("[subscription-reminders] échec lecture subscriptions", error);
    return NextResponse.json({ error: "Erreur lors de la lecture des abonnements." }, { status: 500 });
  }

  let sent = 0;
  let cyclesReset = 0;

  for (const sub of subs ?? []) {
    const listingsField = sub.listings as { title: string } | { title: string }[] | null;
    const listingTitleRaw = Array.isArray(listingsField) ? listingsField[0]?.title : listingsField?.title;

    // ── Paiement échoué : notification unique, indépendante du décompte d'échéance ──
    // Garde is_free_launch = false : une ligne gratuite n'a jamais de vraie carte
    // Stripe derrière elle, donc ne devrait jamais atteindre 'past_due' par un
    // chemin réel du code — mais si c'était le cas, cet email affirmerait à tort
    // qu'une carte a été refusée.
    if (sub.status === "past_due" && !sub.is_free_launch) {
      if (sub.reminder_past_due_sent) continue;

      const { data: profile } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", sub.user_id)
        .single();

      if (!profile?.email) continue;

      const preferredLanguage: "fr" | "en" = profile.preferred_language === "en" ? "en" : "fr";
      const { error: emailError } = await sendPaymentFailedEmail({
        email: profile.email,
        preferredLanguage,
        firstName: profile.name?.trim().split(/\s+/)[0],
        listingTitle: listingTitleRaw || (preferredLanguage === "en" ? "your listing" : "ton chalet"),
        priceCents: sub.price_cents,
      });

      if (emailError) {
        console.error(`[subscription-reminders] échec envoi notification paiement échoué (subscription ${sub.id})`, emailError);
        continue; // pas de flag posé — retry au prochain passage du cron
      }

      await supabase.from("subscriptions").update({ reminder_past_due_sent: true }).eq("id", sub.id);
      sent++;
      continue;
    }

    // ── Abonnement actif : logique de décompte d'échéance inchangée ──
    const expiresAt = new Date(sub.expires_at as string);
    const storedCycle = sub.reminder_cycle_expires_at
      ? new Date(sub.reminder_cycle_expires_at as string).getTime()
      : null;

    const flags = {
      reminder_30d_sent: sub.reminder_30d_sent as boolean,
      reminder_10d_sent: sub.reminder_10d_sent as boolean,
      reminder_3d_sent: sub.reminder_3d_sent as boolean,
      reminder_auto_renewal_sent: sub.reminder_auto_renewal_sent as boolean,
    };

    if (storedCycle !== expiresAt.getTime()) {
      // expires_at a changé depuis le dernier passage (renouvellement) — nouveau cycle.
      flags.reminder_30d_sent = false;
      flags.reminder_10d_sent = false;
      flags.reminder_3d_sent = false;
      flags.reminder_auto_renewal_sent = false;
      await supabase
        .from("subscriptions")
        .update({ ...flags, reminder_cycle_expires_at: sub.expires_at })
        .eq("id", sub.id);
      cyclesReset++;
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS);

    const isFreeLaunch = sub.is_free_launch as boolean;
    const dueThresholds = isFreeLaunch
      ? RENEWAL_THRESHOLDS.filter(({ days, column }) => daysRemaining <= days && !flags[column])
      : [];
    const autoRenewalDue = !isFreeLaunch && daysRemaining <= 30 && !flags.reminder_auto_renewal_sent;

    if (dueThresholds.length === 0 && !autoRenewalDue) continue;

    const { data: profile } = await supabase
      .from("users")
      .select("email, name, preferred_language")
      .eq("id", sub.user_id)
      .single();

    if (!profile?.email) continue;

    const preferredLanguage: "fr" | "en" = profile.preferred_language === "en" ? "en" : "fr";
    const firstName = profile.name?.trim().split(/\s+/)[0];
    const listingTitle = listingTitleRaw || (preferredLanguage === "en" ? "your listing" : "ton chalet");

    if (isFreeLaunch) {
      for (const { days, column } of dueThresholds) {
        const { error: emailError } = await sendSubscriptionReminderEmail({
          email: profile.email,
          preferredLanguage,
          firstName,
          threshold: days,
          expiresAt,
          listingTitle,
        });

        if (emailError) {
          console.error(`[subscription-reminders] échec envoi rappel ${days}j (subscription ${sub.id})`, emailError);
          continue; // pas de flag posé — retry au prochain passage du cron
        }

        await supabase.from("subscriptions").update({ [column]: true }).eq("id", sub.id);
        sent++;
      }
    } else if (autoRenewalDue) {
      const { error: emailError } = await sendAutoRenewalReminderEmail({
        email: profile.email,
        preferredLanguage,
        firstName,
        expiresAt,
        listingTitle,
        priceCents: sub.price_cents ?? 0,
      });

      if (emailError) {
        console.error(`[subscription-reminders] échec envoi rappel renouvellement auto (subscription ${sub.id})`, emailError);
      } else {
        await supabase.from("subscriptions").update({ reminder_auto_renewal_sent: true }).eq("id", sub.id);
        sent++;
      }
    }
  }

  // ── Dépublication automatique (abonnement annulé ou offre de lancement expirée) ──
  // Chaque ligne subscriptions porte déjà son listing_id — plus besoin de fan-out par
  // host_id, on cible directement l'annonce concernée. Idempotent par construction :
  // le filtre is_published = true fait qu'une annonce déjà dépubliée pour cette raison
  // n'est plus jamais re-traitée les jours suivants.
  const { data: lapsedSubs, error: lapsedError } = await supabase
    .from("subscriptions")
    .select("listing_id")
    .or(`status.eq.canceled,and(is_free_launch.eq.true,expires_at.lt.${new Date().toISOString()})`);

  let unpublished = 0;

  if (lapsedError) {
    console.error("[subscription-reminders] échec lecture abonnements expirés/annulés", lapsedError);
  } else {
    const unpublishedAt = new Date().toISOString();
    for (const sub of lapsedSubs ?? []) {
      // reminder_winback_*_sent remis à false ici, uniquement au moment de la
      // transition publié → dépublié (jamais les jours suivants, grâce au filtre
      // is_published = true) — évite qu'un flag posé lors d'un cycle précédent
      // bloque à tort la séquence de retour d'un nouveau cycle.
      const { data: toUnpublish, error: unpublishError } = await supabase
        .from("listings")
        .update({
          is_published: false,
          unpublished_reason: "subscription",
          unpublished_at: unpublishedAt,
          reminder_winback_3d_sent: false,
          reminder_winback_14d_sent: false,
        })
        .eq("id", sub.listing_id)
        .eq("is_published", true)
        .select("id");

      if (unpublishError) {
        console.error(`[subscription-reminders] échec dépublication (listing ${sub.listing_id})`, unpublishError);
        continue;
      }

      unpublished += toUnpublish?.length ?? 0;
    }
  }

  // ── Retour (win-back) — par annonce individuelle, plus par proprio. Chaque
  // annonce a maintenant son propre unpublished_at et ses propres flags, puisque
  // deux annonces du même proprio peuvent expirer/s'annuler à des moments différents.
  const { data: unpublishedListings, error: winbackError } = await supabase
    .from("listings")
    .select("id, host_id, title, unpublished_at, reminder_winback_3d_sent, reminder_winback_14d_sent")
    .eq("unpublished_reason", "subscription")
    .not("unpublished_at", "is", null);

  let winbackSent = 0;

  if (winbackError) {
    console.error("[subscription-reminders] échec lecture annonces dépubliées (win-back)", winbackError);
  } else {
    for (const listing of unpublishedListings ?? []) {
      const daysSince = Math.floor((Date.now() - new Date(listing.unpublished_at as string).getTime()) / DAY_MS);
      const dueThreshold = WINBACK_THRESHOLDS.find(
        ({ days, column }) => daysSince >= days && !listing[column as "reminder_winback_3d_sent" | "reminder_winback_14d_sent"]
      );
      if (!dueThreshold) continue;

      const { data: profile } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", listing.host_id)
        .single();

      if (!profile?.email) continue;

      const winbackLang: "fr" | "en" = profile.preferred_language === "en" ? "en" : "fr";
      const { error: emailError } = await sendWinbackReminderEmail({
        email: profile.email,
        preferredLanguage: winbackLang,
        firstName: profile.name?.trim().split(/\s+/)[0],
        threshold: dueThreshold.days,
        listingTitle: listing.title || (winbackLang === "en" ? "your listing" : "ton chalet"),
      });

      if (emailError) {
        console.error(`[subscription-reminders] échec envoi rappel win-back ${dueThreshold.days}j (listing ${listing.id})`, emailError);
        continue; // pas de flag posé — retry au prochain passage du cron
      }

      await supabase.from("listings").update({ [dueThreshold.column]: true }).eq("id", listing.id);
      winbackSent++;
    }
  }

  return NextResponse.json({ ok: true, checked: subs?.length ?? 0, sent, cyclesReset, unpublished, winbackSent });
}
