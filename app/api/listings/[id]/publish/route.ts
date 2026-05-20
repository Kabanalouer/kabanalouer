import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.status !== "active") {
    return NextResponse.json({ error: "Abonnement inactif" }, { status: 403 });
  }

  const { error } = await supabase
    .from("listings")
    .update({ is_published: true })
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erreur lors de la publication" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
