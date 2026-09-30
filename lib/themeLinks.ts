import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { visiblePromoFilter, MIN_DEAL_LISTINGS_FOR_INDEX } from "@/lib/promoLabel";

// Liens du pied de page et du menu mobile vers les pages thématiques (pas cher,
// chiens, accessible) et la page des régions : affichés seulement quand la page
// a assez de contenu. Mêmes seuils que le noindex / sitemap (voir app/sitemap.ts
// et generateMetadata dans app/chalets/[...segments]/page.tsx). Les pages
// elles-mêmes restent en ligne : seuls les liens sont masqués.

// Même valeur que MIN_CHALETS_FOR_INDEX dans app/sitemap.ts
const MIN_CHALETS_FOR_LINK = 1;
// /regions liste toutes les régions : lien affiché seulement quand au moins
// ce nombre de régions ont un chalet publié (sinon la page est surtout vide).
const MIN_REGIONS_FOR_LINK = 3;

export type ThemeLinkVisibility = {
  deals: boolean;
  dogFriendly: boolean;
  accessible: boolean;
  regions: boolean;
};

// Nombre de chalets publiés avec une promo visible aujourd'hui (seuil d'indexation)
export async function countDealListingsWith(supabase: SupabaseClient): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data: promos } = await supabase
    .from("promotions")
    .select("listing_id")
    .eq("is_active", true)
    .or(visiblePromoFilter(today));
  const ids = [...new Set((promos ?? []).map((p) => p.listing_id as string))];
  if (ids.length === 0) return 0;
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .in("id", ids);
  return count ?? 0;
}

// Client anonyme sans cookies : le résultat est le même pour tous les visiteurs,
// donc mis en cache (unstable_cache n'accepte pas cookies() de toute façon).
async function computeThemeLinkVisibility(): Promise<ThemeLinkVisibility> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const [dogs, accessible, regionRows, dealCount] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("is_published", true).eq("dogs_allowed", true),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("is_published", true).eq("reduced_mobility", true),
    supabase.from("listings").select("region").eq("is_published", true),
    countDealListingsWith(supabase),
  ]);

  const activeRegions = new Set(
    (regionRows.data ?? []).map((r) => r.region as string | null).filter(Boolean)
  );

  return {
    deals: dealCount >= MIN_DEAL_LISTINGS_FOR_INDEX,
    dogFriendly: (dogs.count ?? 0) >= MIN_CHALETS_FOR_LINK,
    accessible: (accessible.count ?? 0) >= MIN_CHALETS_FOR_LINK,
    regions: activeRegions.size >= MIN_REGIONS_FOR_LINK,
  };
}

// Rafraîchi au plus toutes les 10 minutes : un lien qui apparaît avec un peu
// de retard après la publication d'un chalet n'a aucune importance.
export const getThemeLinkVisibility = unstable_cache(
  computeThemeLinkVisibility,
  ["theme-link-visibility"],
  { revalidate: 600 }
);
