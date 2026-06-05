import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/generateSlug";

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  column: "slug_fr" | "slug_en",
  excludeId: string
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq(column, candidate)
      .neq("id", excludeId)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { listingId: string; titleFr: string; titleEn: string };
  const { listingId, titleFr, titleEn } = body;
  if (!listingId || !titleFr) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // Verify the listing belongs to the user
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

  const baseFr = generateSlug(titleFr, "fr");
  const baseEn = titleEn ? generateSlug(titleEn, "en") : baseFr;

  const [slugFr, slugEn] = await Promise.all([
    uniqueSlug(supabase, baseFr, "slug_fr", listingId),
    uniqueSlug(supabase, baseEn, "slug_en", listingId),
  ]);

  const { error } = await supabase
    .from("listings")
    .update({ slug_fr: slugFr, slug_en: slugEn })
    .eq("id", listingId);

  if (error) return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });

  return NextResponse.json({ slug_fr: slugFr, slug_en: slugEn });
}
