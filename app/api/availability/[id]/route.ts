import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/availability/[id]
// Body: { dates: string[] }  — complete list of manually blocked dates (replaces existing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { dates } = (await request.json()) as { dates: string[] };

  // Delete all existing manual blocks for this listing
  // RLS ensures only the owner can do this
  const { error: deleteError } = await supabase
    .from("availability")
    .delete()
    .eq("listing_id", id)
    .eq("source", "manual");

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (dates.length > 0) {
    // Upsert: insert manual blocks, overwrite ical blocks on same date
    const { error: upsertError } = await supabase
      .from("availability")
      .upsert(
        dates.map((date) => ({
          listing_id: id,
          date,
          is_blocked: true,
          source: "manual",
        })),
        { onConflict: "listing_id,date" }
      );

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: dates.length });
}
