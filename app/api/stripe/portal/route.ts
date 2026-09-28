import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { localePath } from "@/lib/localePath";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: t2(locale, "Aucun abonnement trouvé", "No subscription found") }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}${localePath("/dashboard/subscription", locale)}`,
    locale: locale === "en" ? "en" : "fr-CA",
  });

  return NextResponse.json({ url: session.url });
}
