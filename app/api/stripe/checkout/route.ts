import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getNextPaidRank, priceForRank } from "@/lib/subscriptionPricing";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json().catch(() => ({}));
  const listingId: string | undefined = body.listingId;

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!listingId) {
    return NextResponse.json({ error: "listingId requis" }, { status: 400 });
  }

  // Fetch user profile to get or create Stripe customer
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, email, name, role, preferred_language")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "host") {
    return NextResponse.json({ error: "Accès réservé aux propriétaires" }, { status: 403 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "Cette annonce a déjà un abonnement actif" }, { status: 409 });
  }

  const preferredLanguage: "fr" | "en" = profile?.preferred_language === "en" ? "en" : "fr";
  const rank = await getNextPaidRank(supabase, user.id);
  const { priceId, tier } = priceForRank(rank);

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.name ?? undefined,
      preferred_locales: [preferredLanguage],
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    locale: preferredLanguage,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/listings/${listingId}/publish?paid=1`,
    cancel_url: `${appUrl}/dashboard/listings/${listingId}/publish?canceled=1`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id, listing_id: listingId, price_tier: tier },
  });

  return NextResponse.json({ url: session.url });
}
