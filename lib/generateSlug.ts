import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "./slugify";

const STOPWORDS_FR = new Set([
  "le","la","les","l","un","une","des","et","ou","de","du","d",
  "en","au","aux","ce","se","sur","par","pour","avec","sans","dans","qui","que",
]);

const STOPWORDS_EN = new Set([
  "the","a","an","and","or","of","in","at","to","for","with",
  "by","from","on","as","is","are","was","were",
]);

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function generateSlug(text: string, locale: "fr" | "en"): string {
  const stopwords = locale === "fr" ? STOPWORDS_FR : STOPWORDS_EN;
  const parts = text.split(/[\s|,;:!?#@%/\\()\[\]{}'"+&\-]+/);
  const kept = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !stopwords.has(normalizeWord(p)));
  return slugify(kept.join(" ")).slice(0, 80).replace(/-+$/, "");
}

async function uniqueSlug(
  supabase: SupabaseClient,
  base: string,
  column: "slug_fr" | "slug_en",
  excludeId: string
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq(column, candidate)
      .neq("id", excludeId)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}

// Génère et enregistre slug_fr/slug_en pour une annonce si absents. Point
// d'entrée unique appelé depuis les 4 chemins de publication — avant le
// 2026-09-17, seul app/api/listings/[id]/publish/route.ts le faisait,
// laissant les annonces publiées via l'offre de lancement, la révision
// admin des imports, ou le webhook Stripe sans slug (URL brute en UUID).
export async function ensureListingSlugs(
  supabase: SupabaseClient,
  listingId: string
): Promise<void> {
  const { data: listing } = await supabase
    .from("listings")
    .select("title, title_en, slug_fr, slug_en")
    .eq("id", listingId)
    .single();

  if (!listing || (listing.slug_fr && listing.slug_en)) return;

  const titleFr = listing.title as string;
  const titleEn = (listing.title_en as string | null) ?? titleFr;

  const baseFr = generateSlug(titleFr, "fr");
  const baseEn = generateSlug(titleEn, "en");

  const [slugFr, slugEn] = await Promise.all([
    listing.slug_fr ? Promise.resolve(listing.slug_fr as string) : uniqueSlug(supabase, baseFr, "slug_fr", listingId),
    listing.slug_en ? Promise.resolve(listing.slug_en as string) : uniqueSlug(supabase, baseEn, "slug_en", listingId),
  ]);

  const { error } = await supabase
    .from("listings")
    .update({ slug_fr: slugFr, slug_en: slugEn })
    .eq("id", listingId);

  if (!error) return;

  if (error.code === "23505") {
    // Collision improbable malgré la vérification préalable (deux
    // publications quasi simultanées) — filet de sécurité : un nouvel essai
    // avec un suffixe aléatoire suffit largement au volume de ce projet.
    const retrySuffix = Math.random().toString(36).slice(2, 6);
    await supabase
      .from("listings")
      .update({
        slug_fr: listing.slug_fr ?? `${slugFr}-${retrySuffix}`,
        slug_en: listing.slug_en ?? `${slugEn}-${retrySuffix}`,
      })
      .eq("id", listingId);
  } else {
    console.error("ensureListingSlugs: échec mise à jour", error);
  }
}
