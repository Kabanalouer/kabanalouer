import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { userId, action } = (await req.json()) as { userId: string; action: "activate_free" | "extend" | "deactivate" };
  if (!userId || !action) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const admin = adminSupabase();

  if (action === "activate_free") {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const { error: subError } = await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_subscription_id: `free_launch_${userId}`,
      status: "active",
      expires_at: expiresAt.toISOString(),
      is_free_launch: true,
    }, { onConflict: "user_id" });
    if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
    await admin.from("users").update({ role: "host" }).eq("id", userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "extend") {
    const { data: sub } = await admin.from("subscriptions").select("expires_at").eq("user_id", userId).maybeSingle();
    const base = sub?.expires_at ? new Date(sub.expires_at) : new Date();
    if (base < new Date()) base.setTime(Date.now());
    base.setFullYear(base.getFullYear() + 1);
    const { error: extendError } = await admin.from("subscriptions").upsert({
      user_id: userId,
      status: "active",
      expires_at: base.toISOString(),
    }, { onConflict: "user_id" });
    if (extendError) return NextResponse.json({ error: extendError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "deactivate") {
    const { error: deactivateError } = await admin.from("subscriptions").update({ status: "canceled" }).eq("user_id", userId);
    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
