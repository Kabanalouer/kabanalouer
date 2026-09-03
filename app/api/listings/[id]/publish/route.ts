import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/generateSlug";

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

  // Generate slugs if not already set
  const { data: listing } = await supabase
    .from("listings")
    .select("title, title_en, slug_fr, slug_en")
    .eq("id", id)
    .single();

  if (listing && (!listing.slug_fr || !listing.slug_en)) {
    type ListingRow = { title: string; title_en?: string | null; slug_fr?: string | null; slug_en?: string | null };
    const l = listing as ListingRow;
    const titleFr = l.title;
    const titleEn = l.title_en ?? l.title;

    const baseFr = generateSlug(titleFr, "fr");
    const baseEn = generateSlug(titleEn, "en");

    const makeUnique = async (base: string, column: "slug_fr" | "slug_en") => {
      let candidate = base;
      let suffix = 2;
      while (true) {
        const { data: existing } = await supabase
          .from("listings")
          .select("id")
          .eq(column, candidate)
          .neq("id", id)
          .maybeSingle();
        if (!existing) return candidate;
        candidate = `${base}-${suffix++}`;
      }
    };

    const [slugFr, slugEn] = await Promise.all([
      l.slug_fr ? Promise.resolve(l.slug_fr) : makeUnique(baseFr, "slug_fr"),
      l.slug_en ? Promise.resolve(l.slug_en) : makeUnique(baseEn, "slug_en"),
    ]);

    await supabase
      .from("listings")
      .update({ slug_fr: slugFr, slug_en: slugEn })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
