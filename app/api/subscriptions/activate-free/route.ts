import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";
import { FREE_LAUNCH_LIMIT, getFreeLaunchClaimedCount } from "@/lib/subscriptionPricing";

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
    .select("id, title")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const { data: userRow } = await admin
    .from("users")
    .select("free_launch_claimed_at")
    .eq("id", user.id)
    .single();

  // Une seule fois dans sa vie — permanent, indépendant du statut actuel de
  // n'importe laquelle de ses annonces (gratuite annulée ou non, payantes ajoutées depuis).
  if (userRow?.free_launch_claimed_at) {
    return NextResponse.json({ error: "Tu as déjà utilisé ton offre de lancement" }, { status: 409 });
  }

  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("status")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Cette annonce a déjà un abonnement actif" }, { status: 409 });
  }

  const claimedCount = await getFreeLaunchClaimedCount(admin);
  if (claimedCount >= FREE_LAUNCH_LIMIT) {
    return NextResponse.json({ error: "Plus de places gratuites disponibles" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { error: subError } = await admin.from("subscriptions").upsert({
    listing_id: listingId,
    user_id: user.id,
    stripe_subscription_id: `free_launch_${listingId}`,
    status: "active",
    expires_at: expiresAt.toISOString(),
    is_free_launch: true,
    price_tier: "free",
    price_cents: 0,
  }, { onConflict: "listing_id" });

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  await admin.from("users").update({ role: "host", free_launch_claimed_at: new Date().toISOString() }).eq("id", user.id);
  await admin.from("listings").update({ is_published: true }).eq("id", listingId);

  if (user.email) {
    const { data: profile } = await admin
      .from("users")
      .select("preferred_language, name")
      .eq("id", user.id)
      .single();
    const lang: "fr" | "en" = profile?.preferred_language === "en" ? "en" : "fr";
    const { error: emailError } = await sendWelcomeSubscriptionEmail({
      email: user.email,
      preferredLanguage: lang,
      firstName: profile?.name?.trim().split(/\s+/)[0],
      listingTitle: listing.title || (lang === "en" ? "your listing" : "ton chalet"),
    });
    if (emailError) {
      console.error("activate-free: échec envoi email de bienvenue", emailError);
    }
  }

  return NextResponse.json({ success: true });
}
