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

// Fiches non revendiquées dont le titre contient tous les mots saisis (bannière « Pour les proprios » de l'accueil :
// « Nom de votre chalet ou ville »). Comparaison sur les noms normalisés (accents, tirets, majuscules) ; 12 résultats au plus.
export async function findUnclaimedByName(query: string, locale: "fr" | "en"): Promise<UnclaimedMatch[]> {
  // Requête assez précise : des mots d'au moins 3 lettres (un texte comme « le » ne renvoie jamais une liste de fiches au hasard).
  const tokens = normalizeDest(query).split(" ").filter((w) => w.length >= 3);
  if (tokens.length === 0) return [];
  const { data } = await adminSupabase()
    .from("listings")
    .select(COLUMNS)
    .eq("claim_status", "unclaimed")
    .eq("is_published", true)
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(1000);
  return ((data ?? []) as Row[])
    .filter((r) => {
      const hay = normalizeDest(`${r.title ?? ""} ${r.title_en ?? ""}`);
      return tokens.every((w) => hay.includes(w));
    })
    .slice(0, 12)
    .map((r) => toMatch(r, locale));
}

// Fiches non activées (brouillons compris) dont l'adresse au dossier est exactement celle du compte. Jamais par
// domaine : une liste de messageries à exclure serait toujours incomplète, et quelqu'un pourrait prendre les fiches d'un autre.
export async function selectUnclaimedForEmail<T extends { id: string }>(columns: string, email: string, limit = 100): Promise<T[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { data } = await adminSupabase()
    .from("listings")
    .select(columns)
    .ilike("claim_email", normalized.replace(/[\\%_]/g, "\\$&"))
    .eq("claim_status", "unclaimed")
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as unknown as T[];
}

export async function findUnclaimedByEmail(email: string, locale: "fr" | "en"): Promise<UnclaimedMatch[]> {
  const rows = await selectUnclaimedForEmail<Row>(COLUMNS, email, 10);
  return rows.map((r) => toMatch(r, locale));
}
