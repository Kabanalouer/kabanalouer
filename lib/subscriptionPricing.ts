import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_LAUNCH_LIMIT = 50;

export const LISTING_PRICE_IDS = {
  tier1: "price_1ToqE7EVlLGcAv4arl0TmOCz",
  tier2_3: "price_1TqeYhEVlLGcAv4aUUuiwT8R",
  tier4plus: "price_1TqeYhEVlLGcAv4a9mPZ8H0T",
} as const;

export type PriceTier = "tier1" | "tier2_3" | "tier4plus";

export function priceForRank(rank: number): { priceId: string; cents: number; tier: PriceTier } {
  if (rank === 1) return { priceId: LISTING_PRICE_IDS.tier1, cents: 29900, tier: "tier1" };
  if (rank <= 3) return { priceId: LISTING_PRICE_IDS.tier2_3, cents: 24900, tier: "tier2_3" };
  return { priceId: LISTING_PRICE_IDS.tier4plus, cents: 19900, tier: "tier4plus" };
}

// Rang de la PROCHAINE annonce payante de ce proprio. Compte les abonnements
// payants ACTUELLEMENT ACTIFS (pas l'historique total) — annuler une annonce
// libère son rang pour la prochaine ajoutée, tel que confirmé.
export async function getNextPaidRank(admin: SupabaseClient, hostId: string): Promise<number> {
  const { count } = await admin
    .from("subscriptions")
    .select("id, listings!inner(host_id)", { count: "exact", head: true })
    .eq("listings.host_id", hostId)
    .eq("is_free_launch", false)
    .eq("status", "active");

  return (count ?? 0) + 1;
}

// Nombre de proprios ayant déjà réclamé l'offre de lancement, une fois dans leur
// vie — permanent, ne diminue jamais même si l'annonce gratuite est annulée depuis.
export async function getFreeLaunchClaimedCount(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .not("free_launch_claimed_at", "is", null);

  return count ?? 0;
}
