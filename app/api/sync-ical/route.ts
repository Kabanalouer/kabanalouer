import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { parseIcal, expandDates } from "@/lib/ical";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function validateIcalUrl(rawUrl: string): boolean {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }

  if (url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || hostname === "[::1]") return false;

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 127 ||
      a === 10 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) return false;
  }

  return true;
}

async function syncOneListing(
  supabase: ReturnType<typeof adminSupabase>,
  listingId: string,
  icalUrl: string
) {
  if (!validateIcalUrl(icalUrl)) {
    console.error(`[sync-ical] URL invalide ou non autorisée pour listing ${listingId}: ${icalUrl}`);
    return { ok: false, error: "URL iCal invalide ou non autorisée" };
  }

  // Fetch the iCal feed
  let icalText: string;
  try {
    const res = await fetch(icalUrl, {
      headers: { "User-Agent": "Kabanalouer/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icalText = await res.text();
  } catch (err) {
    console.error(`[sync-ical] fetch error for listing ${listingId}:`, err);
    return { ok: false, error: String(err) };
  }

  // Parse events → individual dates
  const events = parseIcal(icalText);
  const allDates = [...new Set(events.flatMap((e) => expandDates(e.start, e.end)))];

  // Delete all previous ical blocks for this listing
  await supabase.from("availability").delete().eq("listing_id", listingId).eq("source", "ical");

  // Insert new ical dates — ON CONFLICT DO NOTHING (don't overwrite manual blocks)
  if (allDates.length > 0) {
    await supabase.from("availability").upsert(
      allDates.map((date) => ({
        listing_id: listingId,
        date,
        is_blocked: true,
        source: "ical",
      })),
      { onConflict: "listing_id,date", ignoreDuplicates: true }
    );
  }

  // Update ical_last_sync on the listing
  await supabase
    .from("listings")
    .update({ ical_last_sync: new Date().toISOString() })
    .eq("id", listingId);

  return { ok: true, count: allDates.length };
}

// GET — called by Vercel cron (runs every hour, syncs all listings)
export async function GET(request: NextRequest) {
  // Vercel automatically sets Authorization: Bearer CRON_SECRET for cron jobs
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, ical_url")
    .not("ical_url", "is", null)
    .neq("ical_url", "");

  if (!listings || listings.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const results = await Promise.allSettled(
    listings.map((l) => syncOneListing(supabase, l.id, l.ical_url!))
  );

  const synced = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  return NextResponse.json({ ok: true, synced, total: listings.length });
}

// POST — called manually from the dashboard for one specific listing
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { listingId } = (await request.json()) as { listingId: string };

  // Verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("id, ical_url, host_id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .single();

  if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!listing.ical_url) return NextResponse.json({ error: "Aucune URL iCal configurée" }, { status: 400 });

  const result = await syncOneListing(adminSupabase(), listingId, listing.ical_url);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, count: result.count });
}
