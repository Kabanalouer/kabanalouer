import type { SupabaseClient } from "@supabase/supabase-js";

// Plage volontairement non séquentielle (voir migration
// supabase/add-listing-number-custom-slug.sql) — ne révèle jamais le nombre
// total d'annonces ni leur ordre de création.
const MIN = 10000;
const MAX = 99999;

function randomListingNumber(): number {
  return Math.floor(MIN + Math.random() * (MAX - MIN + 1));
}

// Génère un listing_number unique, à passer directement dans l'INSERT d'une
// nouvelle fiche (appelé depuis les 2 chemins de création : création
// manuelle dans le dashboard et import Airbnb — voir lib/listingImport.ts).
// Ce numéro doit exister dès la création, y compris pour un brouillon jamais
// publié — contrairement à l'ancien slug_fr/slug_en, généré seulement à la
// publication (et retiré depuis, voir CLAUDE.md section 9).
export async function generateUniqueListingNumber(supabase: SupabaseClient): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = randomListingNumber();
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("listing_number", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Impossible de générer un numéro d'annonce unique après 20 tentatives.");
}
