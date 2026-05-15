import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Fetch user profile to get or create Stripe customer
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, email, name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.name ?? undefined,
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
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/subscription?success=1`,
    cancel_url: `${appUrl}/dashboard/subscription?canceled=1`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
