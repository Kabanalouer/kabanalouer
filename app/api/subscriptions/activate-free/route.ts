import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";

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

  // Éligibilité par ANNONCE, pas par proprio : l'existence d'une ligne
  // subscriptions pour CE listing_id (peu importe son statut) prouve que
  // cette annonce précise a déjà eu — ou a — un abonnement, gratuit ou
  // payant. Un proprio avec plusieurs chalets réclame donc l'offre de
  // lancement séparément pour chacun, tant que celui-ci n'y a jamais touché.
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("status")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existingSub) {
    const message = existingSub.status === "active"
      ? "Cette annonce a déjà un abonnement actif"
      : "Cette annonce a déjà eu un abonnement — l'offre de lancement ne s'applique plus";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { error: subError } = await admin.from("subscriptions").upsert({
    listing_id: listingId,
    user_id: user.id,
    stripe_subscription_id: null,
    status: "active",
    expires_at: expiresAt.toISOString(),
    is_free_launch: true,
    price_tier: "free",
    price_cents: 0,
  }, { onConflict: "listing_id" });

  if (subError) {
    console.error("subscriptions/activate-free: échec upsert subscriptions", subError);
    return NextResponse.json({ error: "Erreur lors de l'activation." }, { status: 500 });
  }

  await admin.from("users").update({ role: "host" }).eq("id", user.id);
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
