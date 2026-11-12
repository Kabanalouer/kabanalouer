import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDogsParam } from "@/lib/dogPolicy";
import { searchListings } from "@/lib/searchListings";

// Résultats de la recherche pour la zone visible de la carte : une page de fiches complètes (`listings`)
// et, sauf `pins=0`, toutes les fiches de la zone sous forme légère pour les épingles (`pins`).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");
  const hasBounds = ![minLat, maxLat, minLng, maxLng].some(Number.isNaN);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await searchListings(
    supabase,
    user?.id ?? null,
    {
      region: searchParams.get("region") || undefined,
      city: searchParams.get("city") || undefined,
      capacity: searchParams.get("capacity") || undefined,
      checkin: searchParams.get("checkin") || undefined,
      checkout: searchParams.get("checkout") || undefined,
      minBedrooms: searchParams.get("minBedrooms") || undefined,
      minBeds: searchParams.get("minBeds") || undefined,
      minBathrooms: searchParams.get("minBathrooms") || undefined,
      amenities: searchParams.get("amenities") || undefined,
      dogsCount: parseDogsParam(searchParams.get("dogs")),
      accessibleOnly: searchParams.get("accessible") === "1",
      bounds: hasBounds ? { minLat, maxLat, minLng, maxLng } : undefined,
      locale: searchParams.get("locale") === "en" ? "en" : "fr",
    },
    parseInt(searchParams.get("page") ?? "1", 10) || 1,
    searchParams.get("pins") !== "0"
  );

  return NextResponse.json(result);
}
