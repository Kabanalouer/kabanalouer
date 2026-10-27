import { adminSupabase } from "@/lib/sendMessage";
import { buildListingPath } from "@/lib/listingUrl";
import { firstPhotoUrl } from "@/lib/photo";
import { maskEmail } from "@/lib/claims/maskedEmail";
import { normalizeDest } from "@/lib/destinationSearch";

// Fiches non revendiquées déjà en ligne qui pourraient être celles d'un proprio qui arrive pour
// inscrire son chalet : trouvées par CITQ (étape « Votre chalet est peut-être déjà sur Kabanalouer »)
// ou par courriel du compte (bandeau du tableau de bord). Lues avec le client service : seules des
// données déjà publiques sur la fiche (titre, ville, photo) et l'adresse MASQUÉE sortent du serveur.

export type UnclaimedMatch = {
  id: string;
  title: string;
  city: string | null;
  photo: string | null;
  path: string | null;
  maskedEmail: string | null;
};

const COLUMNS = "id, title, title_en, city, region, photos, listing_number, custom_slug, claim_email";

type Row = {
  id: string;
  title: string | null;
  title_en: string | null;
  city: string | null;
  region: string | null;
  photos: unknown;
  listing_number: number | null;
  custom_slug: string | null;
  claim_email: string | null;
};

function toMatch(row: Row, locale: "fr" | "en"): UnclaimedMatch {
  return {
    id: row.id,
    title: ((locale === "en" ? row.title_en : null) || row.title || "") as string,
    city: row.city,
    photo: firstPhotoUrl(row.photos) ?? null,
    path: buildListingPath(row, locale),
    maskedEmail: row.claim_email ? maskEmail(row.claim_email) : null,
  };
}

export async function findUnclaimedByCitq(citq: string, locale: "fr" | "en"): Promise<UnclaimedMatch[]> {
  if (!/^\d{6}$/.test(citq)) return [];
  const { data } = await adminSupabase()
    .from("listings")
    .select(COLUMNS)
    .eq("citq_number", citq)
    .eq("claim_status", "unclaimed")
    .eq("is_published", true)
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(10);
  return ((data ?? []) as Row[]).map((r) => toMatch(r, locale));
}

// Fiches non revendiquées d'une ville, pour la page publique « Trouver mon chalet » (sans compte). La base écrit
// les villes de façons variables (« Ste-Agathe-des-Monts », « St-Zénon ») : la comparaison se fait sur les noms
// normalisés (accents, tirets, « st » = « saint »), comme la barre de recherche.
export async function findUnclaimedByCity(city: string, locale: "fr" | "en"): Promise<UnclaimedMatch[]> {
  const wanted = normalizeDest(city);
  if (!wanted) return [];
  const { data } = await adminSupabase()
    .from("listings")
    .select(COLUMNS)
    .eq("claim_status", "unclaimed")
    .eq("is_published", true)
    .eq("is_test", false)
    .not("city", "is", null)
    .order("created_at", { ascending: true })
    .limit(1000);
  return ((data ?? []) as Row[])
    .filter((r) => r.city && normalizeDest(r.city) === wanted)
    .map((r) => toMatch(r, locale));
}

export async function findUnclaimedByEmail(email: string, locale: "fr" | "en"): Promise<UnclaimedMatch[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { data } = await adminSupabase()
    .from("listings")
    .select(COLUMNS)
    .ilike("claim_email", normalized.replace(/[\\%_]/g, "\\$&"))
    .eq("claim_status", "unclaimed")
    .eq("is_published", true)
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(10);
  return ((data ?? []) as Row[]).map((r) => toMatch(r, locale));
}
