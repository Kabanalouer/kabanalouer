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
  month: string;
  listings: { title: string } | { title: string }[] | null;
};

function listingTitleOf(row: FeaturedRow): string | undefined {
  const field = row.listings;
  return Array.isArray(field) ? field[0]?.title : field?.title;
}

// Un boost déjà renouvelé (même annonce+type+région, mois strictement postérieur,
// statut actif ou en attente) rend les emails J-3/expiration de CETTE ligne obsolètes —
// le proprio a déjà agi, lui envoyer "c'est terminé" serait contradictoire.
async function hasNewerRenewal(
  supabase: ReturnType<typeof adminSupabase>,
  featured: FeaturedRow
): Promise<boolean> {
  let query = supabase
    .from("featured_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", featured.listing_id)
    .eq("type", featured.type)
    .in("status", ["active", "pending"])
    .gt("month", featured.month);

  if (featured.type === "region") {
    query = query.eq("region", featured.region);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
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
    return NextResponse.json({ error: "Erreur lors de la mise à jour des vedettes." }, { status: 500 });
  }

  // ── Rappel J-3 : vedettes actives se terminant dans 3 jours ────────────────
  let reminderSent = 0;
  let reminderSkipped = 0;
  const threeDaysFromNow = new Date(Date.now() + 3 * DAY_MS).toISOString();

  const { data: expiringSoon, error: expiringError } = await supabase
    .from("featured_listings")
    .select("id, listing_id, host_id, type, region, month, listings(title)")
    .eq("status", "active")
    .lte("expires_at", threeDaysFromNow)
    .is("reminder_3d_sent_at", null);

  if (expiringError) {
    console.error("[expire-featured] échec lecture vedettes bientôt terminées", expiringError);
  } else {
    for (const featured of (expiringSoon ?? []) as FeaturedRow[]) {
      if (await hasNewerRenewal(supabase, featured)) {
        await supabase.from("featured_listings").update({ reminder_3d_sent_at: new Date().toISOString() }).eq("id", featured.id);
        reminderSkipped++;
        continue; // déjà renouvelé — pas de rappel inutile, mais on arrête de réévaluer cette ligne
      }

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
        month: featured.month.slice(0, 7),
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
  let expiredSkipped = 0;
  const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS).toISOString();

  const { data: justExpired, error: justExpiredError } = await supabase
    .from("featured_listings")
    .select("id, listing_id, host_id, type, region, month, listings(title)")
    .eq("status", "expired")
    .gte("expires_at", threeDaysAgo)
    .is("expired_email_sent_at", null);

  if (justExpiredError) {
    console.error("[expire-featured] échec lecture vedettes expirées", justExpiredError);
  } else {
    for (const featured of (justExpired ?? []) as FeaturedRow[]) {
      if (await hasNewerRenewal(supabase, featured)) {
        await supabase.from("featured_listings").update({ expired_email_sent_at: new Date().toISOString() }).eq("id", featured.id);
        expiredSkipped++;
        continue; // déjà renouvelé — pas de notification contradictoire, mais on arrête de réévaluer cette ligne
      }

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
        month: featured.month.slice(0, 7),
      });

      if (emailError) {
        console.error(`[expire-featured] échec envoi notification d'expiration (featured_listing ${featured.id})`, emailError);
        continue; // pas de flag posé — retry au prochain passage du cron
      }

      await supabase.from("featured_listings").update({ expired_email_sent_at: new Date().toISOString() }).eq("id", featured.id);
      expiredEmailSent++;
    }
  }

  return NextResponse.json({ ok: true, expired: data?.length ?? 0, reminderSent, reminderSkipped, expiredEmailSent, expiredSkipped });
}
