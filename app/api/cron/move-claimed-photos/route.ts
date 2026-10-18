import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { PhotoItem } from "@/lib/photo";

export const maxDuration = 60;

// Plafond de fichiers déplacés par exécution : une fiche de 80 photos se termine en 2 passages.
const MOVE_BUDGET = 40;

const BUCKET = "listing-photos";

// GET — appelé par le cron Vercel (toutes les 10 minutes) : les photos d'une fiche
// importée sont rangées dans le dossier du compte système. Une fois la fiche
// revendiquée, elles sont déplacées dans le dossier du nouveau propriétaire — la
// règle de stockage (supabase/storage.sql) n'autorise la suppression que dans son
// propre dossier, donc sans ça « supprimer une photo » (PhotoUpload) échouerait en
// silence. Les adresses sont réécrites juste après chaque déplacement.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sys } = await admin.from("users").select("id").eq("is_system", true).maybeSingle();
  if (!sys) return NextResponse.json({ ok: true, listings: 0 });
  const marker = `/${BUCKET}/${sys.id}/`;

  const { data: listings, error } = await admin
    .from("listings")
    .select("id, host_id, photos, rooms(photos)")
    .eq("claim_status", "claimed");
  if (error) {
    console.error("[cron move-claimed-photos]", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const urlsOf = (photos: unknown, rooms: { photos: unknown }[]) => [
    ...((photos ?? []) as PhotoItem[]).map((p) => p.url),
    ...rooms.flatMap((r) => (Array.isArray(r.photos) ? (r.photos as string[]) : [])),
  ];

  let budget = MOVE_BUDGET;
  const report: { listingId: string; moved: number; failed: number }[] = [];

  for (const listing of listings ?? []) {
    if (budget <= 0) break;
    const pending = [...new Set(urlsOf(listing.photos, (listing.rooms ?? []) as { photos: unknown }[]))].filter(
      (u) => typeof u === "string" && u.includes(marker)
    );
    if (pending.length === 0) continue;

    const mapping = new Map<string, string>();
    let failed = 0;
    for (const url of pending.slice(0, budget)) {
      const path = decodeURIComponent(url.split(`/${BUCKET}/`)[1]?.split("?")[0] ?? "");
      // Les adresses de photos sont modifiables par le proprio : on ne déplace QUE les
      // fichiers rangés sous le dossier de CETTE fiche (<compte système>/<id de la fiche>/…,
      // voir lib/rehostPhotos.ts), jamais un fichier d'une autre fiche non revendiquée.
      const prefix = `${sys.id}/${listing.id}/`;
      const fileName = path.slice(prefix.length);
      if (!path.startsWith(prefix) || !fileName || fileName.includes("/") || fileName.includes("..")) {
        failed++;
        continue;
      }
      const newPath = `${listing.host_id}/${fileName}`;
      const { error: moveError } = await admin.storage.from(BUCKET).move(path, newPath);
      // Déjà présent à destination (nom déterministe, même contenu) : l'adresse peut être réécrite.
      if (moveError && !/already exists|duplicate/i.test(moveError.message)) {
        console.error("[cron move-claimed-photos] échec du déplacement", moveError.message, path);
        failed++;
        continue;
      }
      mapping.set(url, admin.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl);
    }
    budget -= mapping.size + failed;

    if (mapping.size > 0) {
      // Relit juste avant d'écrire : ne pas écraser une modification faite par le proprio entre-temps.
      const { data: fresh } = await admin.from("listings").select("photos").eq("id", listing.id).single();
      const photos = ((fresh?.photos ?? []) as PhotoItem[]).map((p) => (mapping.has(p.url) ? { ...p, url: mapping.get(p.url)! } : p));
      const { error: updateError } = await admin.from("listings").update({ photos }).eq("id", listing.id);
      if (updateError) console.error("[cron move-claimed-photos] échec update listings", updateError.message);

      const { data: freshRooms } = await admin.from("rooms").select("id, photos").eq("listing_id", listing.id);
      for (const room of freshRooms ?? []) {
        const list = Array.isArray(room.photos) ? (room.photos as string[]) : [];
        if (!list.some((u) => mapping.has(u))) continue;
        const { error: roomError } = await admin.from("rooms").update({ photos: list.map((u) => mapping.get(u) ?? u) }).eq("id", room.id);
        if (roomError) console.error("[cron move-claimed-photos] échec update rooms", roomError.message);
      }
    }
    report.push({ listingId: listing.id, moved: mapping.size, failed });
  }

  return NextResponse.json({ ok: true, report });
}
