import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { MAX_FEATURED_HOME, MAX_FEATURED_REGION } from "@/lib/featuredConfig";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json() as {
    action: "add" | "remove";
    listingId?: string;
    type?: "home" | "region";
    month?: string;
    region?: string;
    featuredId?: string;
  };

  const admin = adminSupabase();

  if (body.action === "add") {
    const { listingId, type, month, region } = body;
    if (!listingId || !type || !month) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Check slot availability
    let query = admin
      .from("featured_listings")
      .select("id", { count: "exact", head: true })
      .eq("type", type)
      .eq("month", month)
      .in("status", ["active", "pending"]);

    if (type === "region" && region) {
      query = query.eq("region", region);
    }

    const { count } = await query;
    const max = type === "home" ? MAX_FEATURED_HOME : MAX_FEATURED_REGION;
    if ((count ?? 0) >= max) {
      return NextResponse.json({ error: `Les ${max} emplacements sont déjà occupés pour ce mois.` }, { status: 409 });
    }

    const { error } = await admin.from("featured_listings").insert({
      listing_id: listingId,
      type,
      month,
      region: type === "region" ? (region ?? null) : null,
      status: "active",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove") {
    const { featuredId } = body;
    if (!featuredId) return NextResponse.json({ error: "featuredId manquant" }, { status: 400 });

    const { error } = await admin
      .from("featured_listings")
      .update({ status: "expired" })
      .eq("id", featuredId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
