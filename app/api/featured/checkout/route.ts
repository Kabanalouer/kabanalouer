import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/siteUrl";
import {
  MAX_FEATURED_HOME,
  MAX_FEATURED_REGION,
  MAX_MONTHS_AHEAD,
  STRIPE_PRICE_FEATURED_HOME,
  STRIPE_PRICE_FEATURED_REGION,
} from "@/lib/featuredConfig";
import { STRIPE_TAX_RATE_IDS } from "@/lib/stripeTaxRates";

function allowedMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i <= MAX_MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId: string | undefined = body.listingId;
  const type: string | undefined = body.type;
  const month: string | undefined = body.month;

  if (!listingId || (type !== "home" && type !== "region") || !month) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  if (!allowedMonths().includes(month)) {
    return NextResponse.json({ error: "Mois non disponible" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, region")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const monthDate = `${month}-01`;

  const { data: ownFeatured } = await supabase
    .from("featured_listings")
    .select("id")
    .eq("listing_id", listingId)
    .eq("type", type)
    .eq("month", monthDate)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (ownFeatured) {
    return NextResponse.json({ error: "Cette annonce a déjà un boost pour ce mois." }, { status: 409 });
  }

  let slotQuery = supabase
    .from("featured_listings")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .eq("month", monthDate)
    .in("status", ["pending", "active"]);

  if (type === "region") {
    slotQuery = slotQuery.eq("region", listing.region);
  }

  const { count } = await slotQuery;
  const max = type === "home" ? MAX_FEATURED_HOME : MAX_FEATURED_REGION;

  if ((count ?? 0) >= max) {
    return NextResponse.json({ error: "Les places sont déjà toutes occupées pour ce mois." }, { status: 409 });
  }

  const price = type === "home" ? STRIPE_PRICE_FEATURED_HOME : STRIPE_PRICE_FEATURED_REGION;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price,
        quantity: 1,
        ...(STRIPE_TAX_RATE_IDS ? { tax_rates: STRIPE_TAX_RATE_IDS } : {}),
      },
    ],
    success_url: `${SITE_URL}/dashboard/listings/${listingId}/edit?paid=1`,
    cancel_url: `${SITE_URL}/dashboard/listings/${listingId}/edit?canceled=1`,
    metadata: {
      listing_id: listingId,
      type,
      month,
      host_id: user.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
