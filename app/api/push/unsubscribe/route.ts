import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) {
    return NextResponse.json({ error: t2(locale, "Paramètres manquants", "Missing parameters") }, { status: 400 });
  }

  const admin = adminSupabase();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[push/unsubscribe] échec de la suppression", error);
    return NextResponse.json(
      { error: t2(locale, "Impossible de désactiver les notifications. Réessayez.", "Could not disable notifications. Please try again.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
