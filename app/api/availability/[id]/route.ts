import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/availability/[id]
// Body: { dates: string[] }  — complete list of manually blocked dates (replaces existing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Vérification explicite en plus de RLS (défense en profondeur — revue de sécurité 2026-07-10)
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

  const { dates } = (await request.json()) as { dates: string[] };

  // Delete all existing manual blocks for this listing
  // RLS ensures only the owner can do this (vérification explicite ci-dessus en plus)
  const { error: deleteError } = await supabase
    .from("availability")
    .delete()
    .eq("listing_id", id)
    .eq("source", "manual");

  if (deleteError) {
    console.error("availability/[id]: échec suppression blocages manuels", deleteError);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du calendrier." }, { status: 500 });
  }

  if (dates.length > 0) {
    // Upsert: insert manual blocks, overwrite ical blocks on same date
    const { error: upsertError } = await supabase
      .from("availability")
      .upsert(
        dates.map((date) => ({
          listing_id: id,
          date,
          is_blocked: true,
          source: "manual",
        })),
        { onConflict: "listing_id,date" }
      );

    if (upsertError) {
      console.error("availability/[id]: échec upsert blocages manuels", upsertError);
      return NextResponse.json({ error: "Erreur lors de la mise à jour du calendrier." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, count: dates.length });
}
