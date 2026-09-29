import { createHash } from "crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoItem } from "@/lib/photo";

// Rapatrie sur notre stockage (bucket listing-photos) les photos d'annonces
// importées qui pointent encore vers le CDN d'Airbnb : plus rapides à servir,
// indépendantes de l'annonce d'origine et sous notre domaine (SEO).
// Utilisé par le cron /api/cron/rehost-photos.

const EXTERNAL_HOST = /(^|\.)muscache\.com$/i;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 2048;

export function isExternalPhotoUrl(url: string): boolean {
  try {
    return EXTERNAL_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Chemin déterministe (hash de l'URL source) : relancer le rapatriement d'une
// même photo réécrit le même fichier au lieu d'en créer un doublon. Rangé dans
// le dossier du proprio pour qu'il puisse la supprimer depuis son tableau de
// bord (même politique de stockage que ses propres photos).
function storagePath(hostId: string, sourceUrl: string): string {
  const hash = createHash("sha1").update(sourceUrl).digest("hex").slice(0, 20);
  return `${hostId}/import-${hash}.webp`;
}

export async function rehostPhoto(
  admin: SupabaseClient,
  hostId: string,
  sourceUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) {
      console.error("[rehostPhoto] téléchargement refusé", res.status, sourceUrl);
      return null;
    }
    const source = Buffer.from(await res.arrayBuffer());
    if (source.byteLength > MAX_SOURCE_BYTES) return null;

    const webp = await sharp(source)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const path = storagePath(hostId, sourceUrl);
    const { error } = await admin.storage
      .from("listing-photos")
      .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (error) {
      console.error("[rehostPhoto] échec upload", error.message, sourceUrl);
      return null;
    }
    return admin.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error("[rehostPhoto]", err, sourceUrl);
    return null;
  }
}

// Rapatrie jusqu'à `budget` photos d'une annonce (galerie + chambres), puis
// enregistre les nouvelles adresses. Relit les photos juste avant d'écrire
// pour ne pas écraser une modification faite par le proprio entre-temps.
export async function rehostListingPhotos(
  admin: SupabaseClient,
  listingId: string,
  hostId: string,
  budget: number
): Promise<{ rehosted: number; failed: number; remaining: number }> {
  const [{ data: listing }, { data: rooms }] = await Promise.all([
    admin.from("listings").select("photos").eq("id", listingId).single(),
    admin.from("rooms").select("id, photos").eq("listing_id", listingId),
  ]);
  const galleryUrls = ((listing?.photos ?? []) as PhotoItem[]).map((p) => p.url);
  const roomUrls = (rooms ?? []).flatMap((r) => (Array.isArray(r.photos) ? (r.photos as string[]) : []));
  const pending = [...new Set([...galleryUrls, ...roomUrls])].filter(isExternalPhotoUrl);
  const batch = pending.slice(0, budget);

  const mapping = new Map<string, string>();
  let failed = 0;
  // 5 téléchargements à la fois : assez rapide sans surcharger la fonction.
  for (let i = 0; i < batch.length; i += 5) {
    const results = await Promise.all(batch.slice(i, i + 5).map((url) => rehostPhoto(admin, hostId, url)));
    results.forEach((newUrl, j) => {
      if (newUrl) mapping.set(batch[i + j], newUrl);
      else failed++;
    });
  }

  if (mapping.size > 0) {
    const { data: fresh } = await admin.from("listings").select("photos").eq("id", listingId).single();
    const photos = ((fresh?.photos ?? []) as PhotoItem[]).map((p) =>
      mapping.has(p.url) ? { ...p, url: mapping.get(p.url)! } : p
    );
    const { error } = await admin.from("listings").update({ photos }).eq("id", listingId);
    if (error) console.error("[rehostListingPhotos] échec update listings", error.message);

    const { data: freshRooms } = await admin.from("rooms").select("id, photos").eq("listing_id", listingId);
    for (const room of freshRooms ?? []) {
      const list = Array.isArray(room.photos) ? (room.photos as string[]) : [];
      if (!list.some((u) => mapping.has(u))) continue;
      const { error: roomError } = await admin
        .from("rooms")
        .update({ photos: list.map((u) => mapping.get(u) ?? u) })
        .eq("id", room.id);
      if (roomError) console.error("[rehostListingPhotos] échec update rooms", roomError.message);
    }
  }

  return { rehosted: mapping.size, failed, remaining: pending.length - mapping.size };
}
