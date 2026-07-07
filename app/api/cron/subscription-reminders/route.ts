import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  sendSubscriptionReminderEmail,
  sendAutoRenewalReminderEmail,
  sendPaymentFailedEmail,
  type ReminderThreshold,
} from "@/lib/emails/subscriptionReminder";

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

const DAY_MS = 24 * 60 * 60 * 1000;

// GET — appelé par le cron Vercel (une fois par jour).
// - status = 'past_due' (paiement Stripe échoué) : un seul email informatif, dès détecté,
//   peu importe expires_at — pas un décompte d'échéance, juste "ton dernier paiement a échoué".
// - status = 'active' + is_free_launch = true : séquence de 3 rappels (30j/10j/3j), renouvellement actif requis.
// - status = 'active' + is_free_launch = false : un seul rappel informatif à 30j, Stripe renouvelle automatiquement.
// Le cycle (reminder_cycle_expires_at) se réinitialise seul dès que expires_at change
// (renouvellement Stripe ou conversion offre gratuite → payant) — aucune logique de
// reset séparée nécessaire ailleurs dans le code. reminder_past_due_sent est géré
// séparément par le webhook (remis à false dès qu'on quitte l'état past_due).
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
      "id, user_id, status, expires_at, is_free_launch, reminder_30d_sent, reminder_10d_sent, reminder_3d_sent, reminder_auto_renewal_sent, reminder_past_due_sent, reminder_cycle_expires_at"
    )
    .not("expires_at", "is", null)
    .or(`and(status.eq.active,expires_at.lte.${windowEnd}),status.eq.past_due`);

  if (error) {
    console.error("[subscription-reminders] échec lecture subscriptions", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let cyclesReset = 0;

  for (const sub of subs ?? []) {
    // ── Paiement échoué : notification unique, indépendante du décompte d'échéance ──
    if (sub.status === "past_due") {
      if (sub.reminder_past_due_sent) continue;

      const { data: profile } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", sub.user_id)
        .single();

      if (!profile?.email) continue;

      const { error: emailError } = await sendPaymentFailedEmail({
        email: profile.email,
        preferredLanguage: profile.preferred_language === "en" ? "en" : "fr",
        firstName: profile.name?.trim().split(/\s+/)[0],
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

    const preferredLanguage = profile.preferred_language === "en" ? "en" : "fr";
    const firstName = profile.name?.trim().split(/\s+/)[0];

    if (isFreeLaunch) {
      for (const { days, column } of dueThresholds) {
        const { error: emailError } = await sendSubscriptionReminderEmail({
          email: profile.email,
          preferredLanguage,
          firstName,
          threshold: days,
          expiresAt,
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
      });

      if (emailError) {
        console.error(`[subscription-reminders] échec envoi rappel renouvellement auto (subscription ${sub.id})`, emailError);
      } else {
        await supabase.from("subscriptions").update({ reminder_auto_renewal_sent: true }).eq("id", sub.id);
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, checked: subs?.length ?? 0, sent, cyclesReset });
}
