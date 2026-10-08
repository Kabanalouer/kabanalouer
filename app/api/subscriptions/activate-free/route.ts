import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";
import { isLaunchOfferActive } from "@/lib/launchOffer";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  // Offre de lancement terminée (lib/launchOffer.ts) : publication par Stripe seulement.
  if (!isLaunchOfferActive()) {
    return NextResponse.json(
      { error: t2(locale, "L'offre de lancement est terminée. Rechargez la page pour publier avec l'abonnement.", "The launch offer has ended. Reload the page to publish with a subscription.") },
      { status: 409 }
    );
  }

  const { listingId } = await request.json();
  if (!listingId) {
    return NextResponse.json({ error: t2(locale, "listingId requis", "listingId required") }, { status: 400 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("id, title, title_en, import_status")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: t2(locale, "Annonce introuvable", "Listing not found") }, { status: 404 });
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
      ? t2(locale, "Cette annonce a déjà un abonnement actif", "This listing already has an active subscription")
      : t2(locale, "Cette annonce a déjà eu un abonnement — l'offre de lancement ne s'applique plus", "This listing has already had a subscription — the launch offer no longer applies");
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
    return NextResponse.json({ error: t2(locale, "Erreur lors de l'activation.", "Error while activating.") }, { status: 500 });
  }

  await admin.from("users").update({ role: "host" }).eq("id", user.id);
  // Annonce importée publiée par son proprio : elle sort de la file /admin/imports.
  await admin
    .from("listings")
    .update({ is_published: true, ...(listing.import_status === "pending_review" ? { import_status: "published" } : {}) })
    .eq("id", listingId);

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
      listingTitle: (lang === "en" ? listing.title_en : null) || listing.title || (lang === "en" ? "your listing" : "ton chalet"),
    });
    if (emailError) {
      console.error("activate-free: échec envoi email de bienvenue", emailError);
    }
  }

  return NextResponse.json({ success: true });
}
