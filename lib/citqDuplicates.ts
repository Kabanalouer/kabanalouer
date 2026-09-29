import type { SupabaseClient } from "@supabase/supabase-js";

// Un même chalet ne doit être publié qu'une fois. Le numéro CITQ (obligatoire
// pour publier) identifie l'établissement réel :
// - déjà publié par le même proprio → doublon certain, la publication est bloquée ;
// - publié par un autre compte → alerte à l'admin seulement, sans bloquer
//   (un établissement peut couvrir plusieurs unités sous un seul numéro, ex. un resort).
export type CitqDuplicates = {
  sameHost: { id: string; title: string | null } | null;
  otherHosts: { id: string; title: string | null; host_id: string }[];
  citq: string | null;
};

export async function findCitqDuplicates(
  client: SupabaseClient,
  listingId: string,
  hostId: string
): Promise<CitqDuplicates> {
  const { data: listing } = await client.from("listings").select("citq_number").eq("id", listingId).single();
  const citq = (listing?.citq_number as string | null)?.trim() || null;
  if (!citq) return { sameHost: null, otherHosts: [], citq: null };

  const { data: rows } = await client
    .from("listings")
    .select("id, title, host_id")
    .eq("citq_number", citq)
    .eq("is_published", true)
    .neq("id", listingId);

  const all = (rows ?? []) as { id: string; title: string | null; host_id: string }[];
  const same = all.find((r) => r.host_id === hostId);
  return {
    sameHost: same ? { id: same.id, title: same.title } : null,
    otherHosts: all.filter((r) => r.host_id !== hostId),
    citq,
  };
}
