import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// In-memory throttle: one view increment per IP per listing per 5 minutes.
// Resets on cold start — intentional for a lightweight counter endpoint.
const viewThrottle = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Only accept requests originating from the site itself
  const origin = req.headers.get("origin") ?? "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://kabanalouer.vercel.app").replace(/\/$/, "");
  if (origin !== appUrl && origin !== "http://localhost:3000") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { listingId } = (await req.json()) as { listingId: string };
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

  // Deduplicate rapid requests from the same IP+listing
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${ip}:${listingId}`;
  const now = Date.now();
  const last = viewThrottle.get(key);
  if (last && now - last < THROTTLE_MS) {
    return NextResponse.json({ ok: true });
  }
  viewThrottle.set(key, now);

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
