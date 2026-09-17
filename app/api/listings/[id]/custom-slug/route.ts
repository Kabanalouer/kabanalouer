import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCustomSlugFormat } from "@/lib/customSlug";

// Enregistre ou retire le lien personnalisé d'une fiche (voir CLAUDE.md
// section 9). Route dédiée plutôt qu'un simple update Supabase direct côté
// client (comme le reste de EditListingForm.tsx) car elle a besoin d'une
// vérification d'unicité explicite avec message clair, et doit conserver
// l'ancien lien dans previous_custom_slug pour que l'ancienne URL continue
// de fonctionner (voir app/chalets/[...segments]/page.tsx).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, host_id, custom_slug")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: viewerProfile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isOwner = listing.host_id === user.id;
  const isAdmin = viewerProfile?.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawValue = typeof body?.customSlug === "string" ? body.customSlug.trim() : "";

  // Champ vide = retirer le lien personnalisé, retomber sur listing_number.
  if (rawValue === "") {
    const { error } = await supabase
      .from("listings")
      .update({
        custom_slug: null,
        previous_custom_slug: listing.custom_slug ?? undefined,
      })
      .eq("id", id);
    if (error) {
      console.error("custom-slug: échec retrait", error);
      return NextResponse.json({ error: "generic" }, { status: 500 });
    }
    return NextResponse.json({ success: true, customSlug: null });
  }

  const formatError = validateCustomSlugFormat(rawValue);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  if (rawValue === listing.custom_slug) {
    return NextResponse.json({ success: true, customSlug: rawValue });
  }

  const { data: conflict } = await supabase
    .from("listings")
    .select("id")
    .eq("custom_slug", rawValue)
    .neq("id", id)
    .maybeSingle();

  if (conflict) {
    return NextResponse.json({ error: "taken" }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      custom_slug: rawValue,
      // Garde le dernier lien personnalisé remplacé (jamais l'UUID/vide) pour
      // que l'ancien lien redirige vers le nouveau au lieu de 404.
      previous_custom_slug: listing.custom_slug ?? undefined,
    })
    .eq("id", id);

  if (updateError) {
    // Collision improbable malgré le check ci-dessus (deux sauvegardes
    // quasi simultanées) — même filet de sécurité que
    // lib/generateListingNumber.ts / l'ancien ensureListingSlugs().
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }
    console.error("custom-slug: échec mise à jour", updateError);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  return NextResponse.json({ success: true, customSlug: rawValue });
}
