import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = getRequestLocale(req);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { data: ownedListing } = await supabase
    .from("listings")
    .select("id, import_status")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!ownedListing) {
    return NextResponse.json({ error: t2(locale, "Annonce introuvable", "Listing not found") }, { status: 404 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("listing_id", id)
    .maybeSingle();

  if (subscription?.status !== "active") {
    return NextResponse.json(
      { error: t2(locale, "Ton abonnement doit être actif pour publier une annonce — renouvelle-le d'abord.", "Your subscription must be active to publish a listing — please renew it first.") },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ is_published: true, ...(ownedListing.import_status === "pending_review" ? { import_status: "published" } : {}) })
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    console.error("listings/[id]/publish: échec publication", error);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la publication", "Error while publishing") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
