import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { translateField } from "@/lib/translateField";
import { normalizePhotos } from "@/lib/photo";
import { detectAndTranslate, detectLanguage } from "@/lib/googleTranslate";

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

// Complète une paire de champs FR/EN d'une annonce quand un des deux manque.
// Le proprio peut avoir écrit dans l'une ou l'autre langue, même dans le
// champ « français » : la langue réelle est détectée. Si le champ FR contient
// de l'anglais, l'original passe dans le champ EN et le champ FR reçoit la
// traduction française (et inversement). Retourne la paire complète à
// écrire, ou null s'il n'y a rien à faire / en cas d'échec.
async function completePair(
  fr: string | null | undefined,
  en: string | null | undefined,
  fieldType: Parameters<typeof translateField>[0]["fieldType"]
): Promise<{ fr: string; en: string } | null> {
  const frText = fr?.trim();
  const enText = en?.trim();
  if (frText && enText) return null;
  const original = frText || enText;
  if (!original) return null;

  const lang = (await detectLanguage(original)) ?? (frText ? "fr" : "en");
  const target = lang === "fr" ? "en" : "fr";
  const translated = await tryTranslate({ text: original, sourceLang: lang, targetLang: target, fieldType });
  if (!translated) return null;
  return lang === "fr" ? { fr: original, en: translated } : { fr: translated, en: original };
}

// GET — appelé par le cron Vercel (toutes les 10 minutes) : balaie les annonces
// publiées dont un champ FR ou EN manque (titre, description, légendes de
// photos, noms de chambre) et le traduit via Sonnet, dans les deux sens
// (voir completePair). Action système, hors
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

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("id, title, title_en, description, description_en, photos")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (listingsError) {
    console.error("[cron translate-listings] échec requête listings", listingsError);
    return NextResponse.json({ error: "Erreur lors de la récupération des annonces." }, { status: 500 });
  }

  const listingIds = (listings ?? []).map((l) => l.id as string);

  const { data: rooms, error: roomsError } = listingIds.length > 0
    ? await supabase.from("rooms").select("id, listing_id, name, name_en").in("listing_id", listingIds)
    : { data: [] as { id: string; listing_id: string; name: string; name_en: string | null }[], error: null };

  if (roomsError) {
    console.error("[cron translate-listings] échec requête rooms", roomsError);
    return NextResponse.json({ error: "Erreur lors de la récupération des chambres." }, { status: 500 });
  }

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

    for (const [frKey, enKey, fieldType] of [
      ["title", "title_en", "title"],
      ["description", "description_en", "description"],
    ] as const) {
      if (fieldsTranslated >= FIELD_CAP) break;
      const pair = await completePair(listing[frKey] as string | null, listing[enKey] as string | null, fieldType);
      if (pair) { updates[frKey] = pair.fr; updates[enKey] = pair.en; fieldsTranslated++; }
    }

    const photos = normalizePhotos(listing.photos);
    for (const photo of photos) {
      if (fieldsTranslated >= FIELD_CAP) break;
      const pair = await completePair(photo.caption, photo.caption_en, "caption");
      if (pair) {
        photo.caption = pair.fr;
        photo.caption_en = pair.en;
        fieldsTranslated++;
        await supabase.from("listings").update({ photos }).eq("id", listing.id);
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("listings").update(updates).eq("id", listing.id);
    }

    const listingRooms = roomsByListing.get(listing.id as string) ?? [];
    for (const room of listingRooms) {
      if (fieldsTranslated >= FIELD_CAP) break;
      const pair = await completePair(room.name, room.name_en, "roomName");
      if (pair) {
        await supabase.from("rooms").update({ name: pair.fr, name_en: pair.en }).eq("id", room.id);
        fieldsTranslated++;
      }
    }
  }

  // Avis et réponses des proprios pas encore traduits (échec à l'écriture,
  // ou avis antérieurs à la traduction automatique) — Google Translate,
  // langue détectée automatiquement.
  let reviewsTranslated = 0;
  const { data: pendingReviews } = await supabase
    .from("reviews")
    .select("id, comment, comment_lang, host_reply, host_reply_lang")
    .or("and(comment.not.is.null,comment_lang.is.null),and(host_reply.not.is.null,host_reply_lang.is.null)")
    .limit(FIELD_CAP);
  for (const review of pendingReviews ?? []) {
    const updates: Record<string, unknown> = {};
    if ((review.comment as string | null)?.trim() && !review.comment_lang) {
      const t = await detectAndTranslate(review.comment as string);
      if (t) { updates.comment_lang = t.lang; updates.comment_translated = t.translated; }
    }
    if ((review.host_reply as string | null)?.trim() && !review.host_reply_lang) {
      const t = await detectAndTranslate(review.host_reply as string);
      if (t) { updates.host_reply_lang = t.lang; updates.host_reply_translated = t.translated; }
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("reviews").update(updates).eq("id", review.id);
      reviewsTranslated++;
    }
  }

  // Présentations (bio) — proprios et voyageurs, écrites en français ou en
  // anglais : langue détectée, traduite vers l'autre (voir lib/bio.ts).
  // bio_en vide = présentation nouvelle ou modifiée depuis la dernière passe.
  if (fieldsTranslated < FIELD_CAP) {
    const { data: pendingBios } = await supabase
      .from("users")
      .select("id, bio")
      .not("bio", "is", null)
      .is("bio_en", null)
      .limit(FIELD_CAP - fieldsTranslated);
    for (const u of pendingBios ?? []) {
      const bio = (u.bio as string | null)?.trim();
      if (!bio) continue;
      const t = await detectAndTranslate(bio);
      if (!t) continue;
      const update = t.lang === "en"
        ? { bio_en: bio, bio_fr: t.translated }
        : { bio_en: t.translated, bio_fr: null };
      await supabase.from("users").update(update).eq("id", u.id);
      fieldsTranslated++;
    }
  }

  return NextResponse.json({ fieldsTranslated, reviewsTranslated });
}
