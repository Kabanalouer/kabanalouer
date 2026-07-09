import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consolidateRanges, generateIcal } from "@/lib/ical";
import { SITE_URL } from "@/lib/siteUrl";

// GET /api/listings/[id]/ical
// Returns an iCal file with all blocked dates for a listing
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: listing }, { data: availability }] = await Promise.all([
    supabase.from("listings").select("title").eq("id", id).eq("is_published", true).single(),
    supabase
      .from("availability")
      .select("date")
      .eq("listing_id", id)
      .eq("is_blocked", true)
      .order("date", { ascending: true }),
  ]);

  if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const sortedDates = (availability ?? []).map((a) => a.date as string);
  const ranges = consolidateRanges(sortedDates);

  const appUrl = SITE_URL;
  const icalContent = generateIcal({
    listingTitle: listing.title,
    listingId: id,
    appUrl,
    ranges,
  });

  return new NextResponse(icalContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="kabanalouer-${id}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
