import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .not("city", "is", null);

  const cities = [
    ...new Set((data ?? []).map((r) => (r.city as string).trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  return NextResponse.json({ cities });
}
