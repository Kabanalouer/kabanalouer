import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeSubscriptionEmail } from "@/lib/emails/welcomeSubscription";

// Use service role for webhook (bypasses RLS — server-only, never exposed to browser)
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Convertit une heure locale America/Toronto en instant UTC, en tenant compte de l'heure d'été/hiver
// (double conversion via Intl — évite une dépendance comme date-fns-tz pour ce seul usage).
function torontoToUtc(year: number, monthIndex: number, day: number, hour: number, minute: number, second: number): Date {
  const guess = Date.UTC(year, monthIndex, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(guess))
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);

  const asIfLocal = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );

  return new Date(guess + (guess - asIfLocal));
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

      // Vedette (paiement unique) — distinct de l'abonnement annuel via mode "payment"
      if (session.mode === "payment") {
        const listingId = session.metadata?.listing_id;
        const type = session.metadata?.type;
        const month = session.metadata?.month;
        const hostId = session.metadata?.host_id;
        if (!listingId || !type || !month || !hostId) break;

        // Stripe peut renvoyer le même événement plusieurs fois — évite le doublon
        const { data: existing } = await supabase
          .from("featured_listings")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (existing) break;

        let region: string | null = null;
        if (type === "region") {
          const { data: listing } = await supabase
            .from("listings")
            .select("region")
            .eq("id", listingId)
            .single();
          region = listing?.region ?? null;
        }

        const [year, monthNum] = month.split("-").map(Number);
        const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
        const expiresAt = torontoToUtc(year, monthNum - 1, lastDay, 23, 59, 59).toISOString();
        const monthDate = `${month}-01`;

        const { error: featuredError } = await supabase.from("featured_listings").insert({
          listing_id: listingId,
          host_id: hostId,
          type,
          region,
          month: monthDate,
          status: "active",
          expires_at: expiresAt,
          stripe_checkout_session_id: session.id,
        });

        if (featuredError) {
          console.error("checkout.session.completed (vedette): échec insert featured_listings", featuredError);
          return NextResponse.json({ error: featuredError.message }, { status: 500 });
        }

        break;
      }

      const userId = session.metadata?.supabase_user_id;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      // current_period_end moved to SubscriptionItem in newer Stripe API versions
      const currentPeriodEnd = new Date(subscription.items.data[0].current_period_end * 1000).toISOString();

      // Un vrai renouvellement annuel ne passe jamais par checkout.session.completed
      // (Stripe facture l'abonnement existant sans nouvelle Checkout Session). Le seul
      // cas à exclure ici est la redélivrance du même événement par Stripe.
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      const isFirstActivation = !existingSub || existingSub.status !== "active";

      const { error: subError } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        status: "active",
        is_free_launch: false,
        expires_at: currentPeriodEnd,
      }, { onConflict: "user_id" });

      if (subError) {
        console.error("checkout.session.completed: échec upsert subscriptions", subError);
        return NextResponse.json({ error: subError.message }, { status: 500 });
      }

      await supabase
        .from("users")
        .update({ role: "host", stripe_customer_id: session.customer as string })
        .eq("id", userId);

      const listingId = session.metadata?.listing_id;
      if (listingId) {
        await supabase.from("listings").update({ is_published: true }).eq("id", listingId);
      }

      if (isFirstActivation) {
        const { data: profile } = await supabase
          .from("users")
          .select("email, preferred_language, name")
          .eq("id", userId)
          .single();
        if (profile?.email) {
          const { error: emailError } = await sendWelcomeSubscriptionEmail({
            email: profile.email,
            preferredLanguage: profile.preferred_language === "en" ? "en" : "fr",
            firstName: profile.name?.trim().split(/\s+/)[0],
          });
          if (emailError) {
            console.error("checkout.session.completed: échec envoi email de bienvenue", emailError);
          }
        }
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

      const { error: subUpdateError } = await supabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status === "active" ? "active" : "inactive",
        expires_at: currentPeriodEnd,
      }, { onConflict: "user_id" });

      if (subUpdateError) {
        console.error("customer.subscription.updated: échec upsert subscriptions", subUpdateError);
        return NextResponse.json({ error: subUpdateError.message }, { status: 500 });
      }

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
