import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { reply } = await req.json() as { reply?: string };

  // Get the review's listing_id
  const { data: review } = await supabase
    .from("reviews")
    .select("listing_id")
    .eq("id", id)
    .single();

  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });

  // Check user is the host of this listing
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id")
    .eq("id", review.listing_id as string)
    .single();

  if (!listing || (listing.host_id as string) !== user.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const admin = adminSupabase();
  const { error } = await admin
    .from("reviews")
    .update({ host_reply: reply?.trim() || null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });

  return NextResponse.json({ success: true });
}
