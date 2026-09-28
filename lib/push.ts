import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Notifications Web Push (PWA). Clés VAPID :
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY (aussi lue côté client par PushOptIn)
//   VAPID_PRIVATE_KEY            (serveur uniquement)
//   VAPID_SUBJECT                (ex. mailto:info@kabanalouer.ca)
// Sans ces variables, tout est un no-op silencieux.

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export type PushResult = { sent: number; failed: number; removed: number };

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@kabanalouer.ca";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    console.error("[push] clés VAPID invalides", err);
    configured = false;
  }
  return configured;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

// Aperçu court pour l'écran de verrouillage — les services push limitent
// la charge utile à ~4 Ko, et un long message n'y serait pas lisible.
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Envoie une notification à tous les appareils abonnés d'un utilisateur.
 * Ne lance jamais d'exception. Les abonnements expirés (404/410) sont supprimés.
 */
export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, removed: 0 };
  if (!ensureConfigured()) return result;

  try {
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      console.error("[push] lecture des abonnements impossible", error);
      return result;
    }
    if (!subs || subs.length === 0) return result;

    const body = JSON.stringify({
      title: truncate(payload.title, 120),
      body: truncate(payload.body, 240),
      url: payload.url,
      tag: payload.tag,
    });

    const expiredIds: string[] = [];
    const deliveredIds: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
            body,
            { TTL: 60 * 60 * 24, urgency: "high" }
          );
          result.sent++;
          deliveredIds.push(sub.id as string);
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(sub.id as string);
          } else {
            result.failed++;
            console.error(`[push] échec d'envoi (user ${userId}, status ${statusCode ?? "?"})`, (err as Error).message);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      const { error: delError } = await admin.from("push_subscriptions").delete().in("id", expiredIds);
      if (delError) console.error("[push] suppression des abonnements expirés impossible", delError);
      else result.removed = expiredIds.length;
    }
    if (deliveredIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString() })
        .in("id", deliveredIds);
    }
  } catch (err) {
    console.error("[push] erreur inattendue", err);
  }

  return result;
}
