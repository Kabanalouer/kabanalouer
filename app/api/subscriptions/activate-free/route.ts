import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";

const FREE_LAUNCH_LIMIT = 50;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { listingId } = await request.json();
  if (!listingId) {
    return NextResponse.json({ error: "listingId requis" }, { status: 400 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const { count } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if ((count ?? 0) >= FREE_LAUNCH_LIMIT) {
    return NextResponse.json({ error: "Plus de places gratuites disponibles" }, { status: 409 });
  }

  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Abonnement déjà actif" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { error: subError } = await admin.from("subscriptions").upsert({
    user_id: user.id,
    stripe_subscription_id: `free_launch_${user.id}`,
    status: "active",
    expires_at: expiresAt.toISOString(),
    is_free_launch: true,
  }, { onConflict: "user_id" });

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  await admin.from("users").update({ role: "host" }).eq("id", user.id);
  await admin.from("listings").update({ is_published: true }).eq("id", listingId);

  if (user.email) {
    const { data: profile } = await admin
      .from("users")
      .select("preferred_language, name")
      .eq("id", user.id)
      .single();
    const { error: emailError } = await sendWelcomeSubscriptionEmail({
      email: user.email,
      preferredLanguage: profile?.preferred_language === "en" ? "en" : "fr",
      firstName: profile?.name?.trim().split(/\s+/)[0],
    });
    if (emailError) {
      console.error("activate-free: échec envoi email de bienvenue", emailError);
    }
  }

  return NextResponse.json({ success: true });
}
