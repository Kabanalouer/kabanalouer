import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook (bypasses RLS — server-only, never exposed to browser)
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 });
  }

  const supabase = adminSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      // current_period_end moved to SubscriptionItem in newer Stripe API versions
      const currentPeriodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString();

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        status: "active",
        is_free_launch: false,
        expires_at: currentPeriodEnd,
      }, { onConflict: "user_id" });

      await supabase
        .from("users")
        .update({ role: "host", stripe_customer_id: session.customer as string })
        .eq("id", userId);

      const listingId = session.metadata?.listing_id;
      if (listingId) {
        await supabase.from("listings").update({ is_published: true }).eq("id", listingId);
      }

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!user) break;

      const currentPeriodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString();

      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status === "active" ? "active" : "inactive",
        expires_at: currentPeriodEnd,
      }, { onConflict: "user_id" });

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!user) break;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", user.id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
