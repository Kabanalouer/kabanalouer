import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isExternalPhotoUrl, rehostListingPhotos } from "@/lib/rehostPhotos";
import type { PhotoItem } from "@/lib/photo";

export const maxDuration = 90;

// Plafond de photos rapatriées par exécution (~1 s chacune, 5 en parallèle) :
// une annonce de 80 photos est terminée en 2 passages, le reste attend le suivant.
const PHOTO_BUDGET = 40;

// GET — appelé par le cron Vercel (toutes les 10 minutes) : rapatrie sur notre
// stockage les photos des annonces importées qui pointent encore vers le CDN
// d'Airbnb (galerie et chambres). Voir lib/rehostPhotos.ts.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Seules les annonces importées ont des photos externes.
  const { data: listings, error } = await admin
    .from("listings")
    .select("id, host_id, photos, rooms(photos)")
    .not("import_source", "is", null);
  if (error) {
    console.error("[cron rehost-photos]", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const todo = (listings ?? []).filter((l) => {
    const gallery = ((l.photos ?? []) as PhotoItem[]).map((p) => p.url);
    const rooms = ((l.rooms ?? []) as { photos: unknown }[]).flatMap((r) =>
      Array.isArray(r.photos) ? (r.photos as string[]) : []
    );
    return [...gallery, ...rooms].some(isExternalPhotoUrl);
  });

  let budget = PHOTO_BUDGET;
  const report: { listingId: string; rehosted: number; failed: number; remaining: number }[] = [];
  for (const listing of todo) {
    if (budget <= 0) break;
    const result = await rehostListingPhotos(admin, listing.id, listing.host_id, budget);
    budget -= result.rehosted + result.failed;
    report.push({ listingId: listing.id, ...result });
  }

  return NextResponse.json({ listings: todo.length, report });
}
