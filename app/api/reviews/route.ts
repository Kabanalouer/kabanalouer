import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { listing_id, rating, comment } = body as { listing_id?: string; rating?: number; comment?: string };

  if (!listing_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  // Eligibility: user must have sent at least one message for this listing
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing_id)
    .eq("sender_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json(
      { error: "Vous devez d'abord contacter le propriétaire pour laisser un avis." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({ listing_id, author_id: user.id, rating, comment: comment?.trim() || null })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà laissé un avis pour ce chalet." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur lors de la soumission." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
