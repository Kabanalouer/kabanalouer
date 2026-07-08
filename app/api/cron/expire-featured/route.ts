import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendFeaturedExpiringEmail, sendFeaturedExpiredEmail, type FeaturedType } from "@/lib/emails/featuredListing";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

type FeaturedRow = {
  id: string;
  listing_id: string;
  host_id: string;
  type: string;
  region: string | null;
  listings: { title: string } | { title: string }[] | null;
};

function listingTitleOf(row: FeaturedRow): string | undefined {
  const field = row.listings;
  return Array.isArray(field) ? field[0]?.title : field?.title;
}

// GET — called by Vercel cron (runs once daily):
// 1. Expire featured listings past their expires_at.
// 2. Send a J-3 reminder to active featured listings ending within 3 days.
// 3. Send an "expired" notification to featured listings recently marked 'expired'.
export async function GET(request: NextRequest) {
  // Vercel automatically sets Authorization: Bearer CRON_SECRET for cron jobs
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from("featured_listings")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[expire-featured] échec update featured_listings", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Rappel J-3 : vedettes actives se terminant dans 3 jours ────────────────
  let reminderSent = 0;
  const threeDaysFromNow = new Date(Date.now() + 3 * DAY_MS).toISOString();

  const { data: expiringSoon, error: expiringError } = await supabase
    .from("featured_listings")
    .select("id, listing_id, host_id, type, region, listings(title)")
    .eq("status", "active")
    .lte("expires_at", threeDaysFromNow)
    .is("reminder_3d_sent_at", null);

  if (expiringError) {
    console.error("[expire-featured] échec lecture vedettes bientôt terminées", expiringError);
  } else {
    for (const featured of (expiringSoon ?? []) as FeaturedRow[]) {
      const { data: profile } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", featured.host_id)
        .single();

      if (!profile?.email) continue;

      const preferredLanguage: "fr" | "en" = profile.preferred_language === "en" ? "en" : "fr";
      const listingTitle = listingTitleOf(featured) || (preferredLanguage === "en" ? "your listing" : "ton chalet");

      const { error: emailError } = await sendFeaturedExpiringEmail({
        email: profile.email,
        preferredLanguage,
        firstName: profile.name?.trim().split(/\s+/)[0],
        listingId: featured.listing_id,
        listingTitle,
        type: featured.type as FeaturedType,
        region: featured.region,
      });

      if (emailError) {
        console.error(`[expire-featured] échec envoi rappel J-3 (featured_listing ${featured.id})`, emailError);
        continue; // pas de flag posé — retry au prochain passage du cron
      }

      await supabase.from("featured_listings").update({ reminder_3d_sent_at: new Date().toISOString() }).eq("id", featured.id);
      reminderSent++;
    }
  }

  // ── Notification d'expiration : vedettes récemment passées à 'expired' ─────
  // Bornée aux 3 derniers jours pour éviter d'envoyer, au premier déploiement
  // de cette colonne, une notification rétroactive à toutes les vedettes déjà
  // expirées depuis longtemps (expired_email_sent_at serait NULL pour toutes).
  let expiredEmailSent = 0;
  const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS).toISOString();

  const { data: justExpired, error: justExpiredError } = await supabase
    .from("featured_listings")
    .select("id, listing_id, host_id, type, region, listings(title)")
    .eq("status", "expired")
    .gte("expires_at", threeDaysAgo)
    .is("expired_email_sent_at", null);

  if (justExpiredError) {
    console.error("[expire-featured] échec lecture vedettes expirées", justExpiredError);
  } else {
    for (const featured of (justExpired ?? []) as FeaturedRow[]) {
      const { data: profile } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", featured.host_id)
        .single();

      if (!profile?.email) continue;

      const preferredLanguage: "fr" | "en" = profile.preferred_language === "en" ? "en" : "fr";
      const listingTitle = listingTitleOf(featured) || (preferredLanguage === "en" ? "your listing" : "ton chalet");

      const { error: emailError } = await sendFeaturedExpiredEmail({
        email: profile.email,
        preferredLanguage,
        firstName: profile.name?.trim().split(/\s+/)[0],
        listingId: featured.listing_id,
        listingTitle,
        type: featured.type as FeaturedType,
        region: featured.region,
      });

      if (emailError) {
        console.error(`[expire-featured] échec envoi notification d'expiration (featured_listing ${featured.id})`, emailError);
        continue; // pas de flag posé — retry au prochain passage du cron
      }

      await supabase.from("featured_listings").update({ expired_email_sent_at: new Date().toISOString() }).eq("id", featured.id);
      expiredEmailSent++;
    }
  }

  return NextResponse.json({ ok: true, expired: data?.length ?? 0, reminderSent, expiredEmailSent });
}
