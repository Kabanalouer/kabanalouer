import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";

// L'attente Apify seule peut prendre jusqu'à ~60s (voir lib/apify.ts) — laisse
// de la marge pour l'appel IA et les écritures qui suivent.
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { url, photosRightsConfirmed } = await request.json().catch(() => ({}));

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Lien d'annonce requis" }, { status: 400 });
  }
  if (photosRightsConfirmed !== true) {
    return NextResponse.json(
      { error: "Vous devez confirmer détenir les droits sur les photos avant d'importer une annonce" },
      { status: 400 }
    );
  }

  const outcome = await importAirbnbListing(supabase, user.id, url);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json(
    { listingId: outcome.listingId, aiRewriteApplied: outcome.aiRewriteApplied },
    { status: 201 }
  );
}
