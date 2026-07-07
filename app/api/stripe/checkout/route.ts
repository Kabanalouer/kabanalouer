import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json().catch(() => ({}));
  const listingId: string | undefined = body.listingId;

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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

  const preferredLanguage: "fr" | "en" = profile?.preferred_language === "en" ? "en" : "fr";

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
        price: "price_1ToqE7EVlLGcAv4arl0TmOCz",
        quantity: 1,
      },
    ],
    success_url: listingId
      ? `${appUrl}/dashboard/listings/${listingId}/publish?paid=1`
      : `${appUrl}/dashboard/subscription?success=1`,
    cancel_url: listingId
      ? `${appUrl}/dashboard/listings/${listingId}/publish?canceled=1`
      : `${appUrl}/dashboard/subscription?canceled=1`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id, ...(listingId ? { listing_id: listingId } : {}) },
  });

  return NextResponse.json({ url: session.url });
}
