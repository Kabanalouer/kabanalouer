import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    console.error("listings/[id]: échec suppression", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'annonce." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
