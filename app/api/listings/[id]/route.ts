import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = getRequestLocale(req);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { data: deleted, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id)
    .select("id");

  if (error) {
    console.error("listings/[id]: échec suppression", error);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la suppression de l'annonce.", "Error while deleting the listing.") }, { status: 500 });
  }

  // Aucune ligne supprimée (annonce d'un autre compte, déjà retirée) : ne jamais afficher un faux succès.
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: t2(locale, "Annonce introuvable ou déjà supprimée.", "Listing not found or already deleted.") }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
