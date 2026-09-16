import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { translateField } from "@/lib/translateField";
import { normalizePhotos } from "@/lib/photo";

export const maxDuration = 90;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FIELD_CAP = 30;

async function tryTranslate(args: Parameters<typeof translateField>[0]): Promise<string | null> {
  try {
    return await translateField(args);
  } catch (err) {
    console.error("[cron translate-listings]", err);
    return null;
  }
}

// GET — appelé par le cron Vercel (toutes les 10 minutes) : balaie les annonces
// publiées avec des champs _en manquants (titre, description, légendes de
// photos, noms de chambre) et les traduit via Sonnet. Action système, hors
// quota IA interactif (n'appelle jamais checkAiRateLimit) — plafond propre
// de FIELD_CAP champs traduits par exécution, le reste attend le prochain
// passage.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, title_en, description, description_en, photos")
    .eq("is_published", true)
    .order("updated_at", { ascending: true });

  const listingIds = (listings ?? []).map((l) => l.id as string);

  const { data: rooms } = listingIds.length > 0
    ? await supabase.from("rooms").select("id, listing_id, name, name_en").in("listing_id", listingIds)
    : { data: [] as { id: string; listing_id: string; name: string; name_en: string | null }[] };

  const roomsByListing = new Map<string, { id: string; name: string; name_en: string | null }[]>();
  for (const room of rooms ?? []) {
    const key = room.listing_id as string;
    const list = roomsByListing.get(key) ?? [];
    list.push({ id: room.id as string, name: room.name as string, name_en: room.name_en as string | null });
    roomsByListing.set(key, list);
  }

  let fieldsTranslated = 0;

  for (const listing of listings ?? []) {
    if (fieldsTranslated >= FIELD_CAP) break;

    const updates: Record<string, unknown> = {};

    if (!listing.title_en && (listing.title as string | null)?.trim()) {
      const translated = await tryTranslate({ text: listing.title as string, sourceLang: "fr", targetLang: "en", fieldType: "title" });
      if (translated) { updates.title_en = translated; fieldsTranslated++; }
    }

    if (fieldsTranslated < FIELD_CAP && !listing.description_en && (listing.description as string | null)?.trim()) {
      const translated = await tryTranslate({ text: listing.description as string, sourceLang: "fr", targetLang: "en", fieldType: "description" });
      if (translated) { updates.description_en = translated; fieldsTranslated++; }
    }

    const photos = normalizePhotos(listing.photos);
    let photosChanged = false;
    for (const photo of photos) {
      if (fieldsTranslated >= FIELD_CAP) break;
      if (photo.caption?.trim() && !photo.caption_en) {
        const translated = await tryTranslate({ text: photo.caption, sourceLang: "fr", targetLang: "en", fieldType: "caption" });
        if (translated) { photo.caption_en = translated; photosChanged = true; fieldsTranslated++; }
      }
    }
    if (photosChanged) updates.photos = photos;

    if (Object.keys(updates).length > 0) {
      await supabase.from("listings").update(updates).eq("id", listing.id);
    }

    const listingRooms = roomsByListing.get(listing.id as string) ?? [];
    for (const room of listingRooms) {
      if (fieldsTranslated >= FIELD_CAP) break;
      if (room.name?.trim() && !room.name_en) {
        const translated = await tryTranslate({ text: room.name, sourceLang: "fr", targetLang: "en", fieldType: "roomName" });
        if (translated) {
          await supabase.from("rooms").update({ name_en: translated }).eq("id", room.id);
          fieldsTranslated++;
        }
      }
    }
  }

  return NextResponse.json({ fieldsTranslated });
}
