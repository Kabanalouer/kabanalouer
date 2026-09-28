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

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    console.error("listings/[id]: échec suppression", error);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la suppression de l'annonce.", "Error while deleting the listing.") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
