import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { importAirbnbListing } from "@/lib/listingImport";

// L'attente Apify seule peut prendre jusqu'à ~60s (voir lib/apify.ts) — laisse
// de la marge pour l'appel IA et les écritures qui suivent.
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { url, photosRightsConfirmed } = await request.json().catch(() => ({}));

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: t2(locale, "Lien d'annonce requis", "Listing link required") }, { status: 400 });
  }
  if (photosRightsConfirmed !== true) {
    return NextResponse.json(
      { error: t2(locale, "Vous devez confirmer détenir les droits sur les photos avant d'importer une annonce", "You must confirm you hold the rights to the photos before importing a listing") },
      { status: 400 }
    );
  }

  // Route hors du middleware next-intl (voir middleware.ts, api/ exclu du matcher) —
  // la langue vient du Referer de la page appelante (lib/requestLocale.ts), français par défaut.
  const tImport = await getTranslations({ locale, namespace: "listings.import" });
  const outcome = await importAirbnbListing(supabase, user.id, url, tImport);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  if (outcome.status === "duplicate") {
    return NextResponse.json(
      { listingId: outcome.listingId },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { listingId: outcome.listingId, aiRewriteApplied: outcome.aiRewriteApplied },
    { status: 201 }
  );
}
