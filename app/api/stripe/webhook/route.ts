import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendFeaturedConfirmationEmail, type FeaturedType } from "@/lib/emails/featuredListing";
import { createInvoice } from "@/lib/invoicing";

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

      // Seules les vedettes (boosts, paiement unique) passent par Stripe .
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

        const { data: listingRow } = await supabase
          .from("listings")
          .select("title, title_en, region")
          .eq("id", listingId)
          .single();
        const region = type === "region" ? (listingRow?.region ?? null) : null;

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
          return NextResponse.json({ error: "Erreur lors de l'enregistrement de la vedette." }, { status: 500 });
        }

        // Facture — un vrai paiement unique (jamais is_free_launch, cette
        // branche n'existe que pour un paiement Stripe réel).
        if (session.amount_subtotal != null && session.amount_total != null) {
          await createInvoice(supabase, {
            userId: hostId,
            listingId,
            transactionType: type === "region" ? "boost_region" : "boost_accueil",
            amountBeforeTaxCents: session.amount_subtotal,
            totalChargedCents: session.amount_total,
            stripePaymentId: (session.payment_intent as string) ?? session.id,
          });
        }

        const { data: hostProfile } = await supabase
          .from("users")
          .select("email, name, preferred_language")
          .eq("id", hostId)
          .single();

        if (hostProfile?.email) {
          const lang: "fr" | "en" = hostProfile.preferred_language === "en" ? "en" : "fr";
          const { error: emailError } = await sendFeaturedConfirmationEmail({
            email: hostProfile.email,
            preferredLanguage: lang,
            firstName: hostProfile.name?.trim().split(/\s+/)[0],
            listingId,
            listingTitle: (lang === "en" ? listingRow?.title_en : null) || listingRow?.title || (lang === "en" ? "your listing" : "ton chalet"),
            type: type as FeaturedType,
            region,
            month,
          });
          if (emailError) {
            console.error("checkout.session.completed (vedette): échec envoi email de confirmation", emailError);
          }
        }

        break;
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}
