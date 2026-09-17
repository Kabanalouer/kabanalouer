import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureListingSlugs } from "@/lib/generateSlug";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: ownedListing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!ownedListing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("listing_id", id)
    .maybeSingle();

  if (subscription?.status !== "active") {
    return NextResponse.json(
      { error: "Ton abonnement doit être actif pour publier une annonce — renouvelle-le d'abord." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ is_published: true })
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    console.error("listings/[id]/publish: échec publication", error);
    return NextResponse.json({ error: "Erreur lors de la publication" }, { status: 500 });
  }

  await ensureListingSlugs(supabase, id);

  return NextResponse.json({ success: true });
}
