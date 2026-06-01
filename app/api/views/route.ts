import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { listingId } = (await req.json()) as { listingId: string };
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

  const supabase = adminSupabase();

  const { data } = await supabase
    .from("listings")
    .select("views_listing")
    .eq("id", listingId)
    .single();

  await supabase
    .from("listings")
    .update({ views_listing: ((data?.views_listing as number) ?? 0) + 1 })
    .eq("id", listingId);

  return NextResponse.json({ ok: true });
}
