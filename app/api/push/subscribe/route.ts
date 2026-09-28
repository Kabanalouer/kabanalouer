import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function isValidEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512;
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!isValidEndpoint(endpoint) || !isKey(p256dh) || !isKey(auth)) {
    return NextResponse.json(
      { error: t2(locale, "Abonnement aux notifications invalide.", "Invalid notification subscription.") },
      { status: 400 }
    );
  }

  // Service-role : un même appareil (endpoint) peut passer d'un compte à
  // l'autre — l'upsert le réattribue à l'utilisateur connecté, ce que la RLS
  // (pas de politique UPDATE) ne permettrait pas.
  const admin = adminSupabase();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] échec de l'enregistrement", error);
    return NextResponse.json(
      { error: t2(locale, "Impossible d'activer les notifications. Réessayez.", "Could not enable notifications. Please try again.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
