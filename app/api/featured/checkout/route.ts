import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { localePath } from "@/lib/localePath";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/siteUrl";
import {
  BOOSTS_ENABLED,
  MAX_FEATURED_HOME,
  MAX_FEATURED_REGION,
  MAX_MONTHS_AHEAD,
  STRIPE_PRICE_FEATURED_HOME,
  STRIPE_PRICE_FEATURED_REGION,
} from "@/lib/featuredConfig";

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
  const locale = getRequestLocale(request);
  if (!BOOSTS_ENABLED) {
    return NextResponse.json({ error: t2(locale, "Les boosts ne sont pas offerts pour le moment.", "Boosts are not available at the moment.") }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const listingId: string | undefined = body.listingId;
  const type: string | undefined = body.type;
  const month: string | undefined = body.month;

  if (!listingId || (type !== "home" && type !== "region") || !month) {
    return NextResponse.json({ error: t2(locale, "Paramètres manquants", "Missing parameters") }, { status: 400 });
  }

  if (!allowedMonths().includes(month)) {
    return NextResponse.json({ error: t2(locale, "Mois non disponible", "Month not available") }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, region, is_published")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: t2(locale, "Accès refusé", "Access denied") }, { status: 403 });
  }

  // Un boost ne s'achète que pour une annonce en ligne (jamais payé pour rien).
  if (!listing.is_published) {
    return NextResponse.json({ error: t2(locale, "Publiez votre annonce avant d'acheter un boost.", "Publish your listing before buying a boost.") }, { status: 400 });
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
    return NextResponse.json({ error: t2(locale, "Cette annonce a déjà un boost pour ce mois.", "This listing already has a boost for this month.") }, { status: 409 });
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
    return NextResponse.json({ error: t2(locale, "Les places sont déjà toutes occupées pour ce mois.", "All spots are already taken for this month.") }, { status: 409 });
  }

  const price = type === "home" ? STRIPE_PRICE_FEATURED_HOME : STRIPE_PRICE_FEATURED_REGION;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: locale === "en" ? "en" : "fr-CA",
    line_items: [
      {
        price,
        quantity: 1,
      },
    ],
    // Stripe Tax calcule maintenant la taxe automatiquement — remplace les
    // tax_rates manuels codés en dur (lib/stripeTaxRates.ts), même
    // changement que app/api/stripe/checkout/route.ts.
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    // Pas de customer_update ici, contrairement à l'abonnement : cette
    // session ne passe jamais de `customer` (aucun Stripe Customer
    // réutilisé/créé pour un achat de vedette), et Stripe rejette
    // customer_update si `customer` n'est pas fourni sur la session
    // ("Can only be provided when customer is provided", doc API Stripe).
    // Sans Customer existant, l'adresse de facturation collectée ici sert
    // directement au calcul de taxe, aucune ambiguïté à résoudre.
    success_url: `${SITE_URL}${localePath(`/dashboard/listings/${listingId}/edit?paid=1`, locale)}`,
    cancel_url: `${SITE_URL}${localePath(`/dashboard/listings/${listingId}/edit?canceled=1`, locale)}`,
    metadata: {
      listing_id: listingId,
      type,
      month,
      host_id: user.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
