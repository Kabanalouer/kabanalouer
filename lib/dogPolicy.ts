// Politique « Chiens acceptés » d'une annonce — source unique des libellés
// FR/EN, partagée par la fiche publique, le JSON-LD (lib/listing-schema.ts),
// la page SEO /chalets/chiens-acceptes et le dashboard. Colonnes
// listings.dogs_* (voir supabase/add-dog-policy.sql).

export type DogSizeLimit = "small" | "medium" | "all";
export type DogFeeType = "free" | "per_night" | "per_stay";

export const DOGS_MAX_LIMIT = 5;

// Page SEO « location chalet avec chien » — segment unique sous /chalets et
// /en/cabins, résolu avant les régions dans app/chalets/[...segments]/page.tsx.
export const DOG_FRIENDLY_SLUG_FR = "chiens-acceptes";
export const DOG_FRIENDLY_SLUG_EN = "dog-friendly";
export const DOG_FRIENDLY_PATH_FR = `/chalets/${DOG_FRIENDLY_SLUG_FR}`;
export const DOG_FRIENDLY_PATH_EN = `/en/cabins/${DOG_FRIENDLY_SLUG_EN}`;
export const DOG_SIZE_LIMITS: DogSizeLimit[] = ["small", "medium", "all"];

export interface DogPolicy {
  allowed: boolean;
  max: number | null;
  sizeLimit: DogSizeLimit | null;
  feeType: DogFeeType | null;
  feeAmount: number | null;
}

// Colonnes à ajouter au .select() de toute requête qui affiche la politique.
export const DOG_POLICY_COLUMNS = "dogs_allowed, dogs_max, dogs_size_limit, dogs_fee_type, dogs_fee_amount";

export function parseDogPolicy(row: Record<string, unknown>): DogPolicy {
  const size = row.dogs_size_limit;
  const fee = row.dogs_fee_type;
  return {
    allowed: !!row.dogs_allowed,
    max: typeof row.dogs_max === "number" ? row.dogs_max : null,
    sizeLimit: size === "small" || size === "medium" || size === "all" ? size : null,
    feeType: fee === "free" || fee === "per_night" || fee === "per_stay" ? fee : null,
    feeAmount: typeof row.dogs_fee_amount === "number" ? row.dogs_fee_amount : null,
  };
}

export function isDogPolicyComplete(p: DogPolicy): boolean {
  if (!p.allowed) return true;
  if (!p.max || !p.sizeLimit || !p.feeType) return false;
  if (p.feeType !== "free" && !(p.feeAmount && p.feeAmount > 0)) return false;
  return true;
}

export function dogSizeLabel(size: DogSizeLimit, locale: string): string {
  const isEn = locale === "en";
  switch (size) {
    case "small":  return isEn ? "Small dogs (25 lbs and under)" : "Petits chiens (25 lbs et moins)";
    case "medium": return isEn ? "Medium dogs (50 lbs and under)" : "Chiens moyens (50 lbs et moins)";
    case "all":    return isEn ? "All dogs welcome" : "Bienvenue à tous les chiens";
  }
}

export function dogMaxLabel(max: number, locale: string): string {
  if (locale === "en") return `Up to ${max} dog${max > 1 ? "s" : ""}`;
  return `Jusqu'à ${max} chien${max > 1 ? "s" : ""}`;
}

function formatFee(amount: number, locale: string): string {
  return locale === "en" ? `$${amount}` : `${amount} $`;
}

export function dogFeeLabel(p: DogPolicy, locale: string): string | null {
  const isEn = locale === "en";
  if (p.feeType === "free") return isEn ? "No extra fee for dogs" : "Aucuns frais supplémentaires pour les chiens";
  if (!p.feeAmount) return null;
  const amount = formatFee(p.feeAmount, locale);
  if (p.feeType === "per_night") return isEn ? `${amount} extra fee per night` : `Frais supplémentaires de ${amount} par nuit`;
  if (p.feeType === "per_stay") return isEn ? `${amount} extra fee per stay` : `Frais supplémentaires de ${amount} par séjour`;
  return null;
}

// Détails affichés sous « Chiens acceptés » — seulement ceux que le proprio
// a réellement renseignés, jamais une valeur supposée.
export function dogPolicyDetails(p: DogPolicy, locale: string): string[] {
  if (!p.allowed) return [];
  return [
    p.max ? dogMaxLabel(p.max, locale) : null,
    p.sizeLimit ? dogSizeLabel(p.sizeLimit, locale) : null,
    dogFeeLabel(p, locale),
  ].filter((l): l is string => l !== null);
}

// Version courte pour les cartes (ex. « 2 chiens max · Gratuit »).
export function dogPolicyShortSummary(p: DogPolicy, locale: string): string | null {
  if (!p.allowed) return null;
  const isEn = locale === "en";
  const parts: string[] = [];
  if (p.max) parts.push(isEn ? `Up to ${p.max} dog${p.max > 1 ? "s" : ""}` : `${p.max} chien${p.max > 1 ? "s" : ""} max`);
  if (p.sizeLimit === "small") parts.push(isEn ? "25 lbs and under" : "25 lbs et moins");
  if (p.sizeLimit === "medium") parts.push(isEn ? "50 lbs and under" : "50 lbs et moins");
  if (p.sizeLimit === "all") parts.push(isEn ? "All sizes" : "Toutes tailles");
  if (p.feeType === "free") parts.push(isEn ? "Free" : "Gratuit");
  if (p.feeType === "per_night" && p.feeAmount) parts.push(isEn ? `${formatFee(p.feeAmount, locale)}/night` : `${formatFee(p.feeAmount, locale)}/nuit`);
  if (p.feeType === "per_stay" && p.feeAmount) parts.push(isEn ? `${formatFee(p.feeAmount, locale)}/stay` : `${formatFee(p.feeAmount, locale)}/séjour`);
  return parts.join(" · ");
}

// Nombre de chiens demandé dans l'URL de recherche (?dogs=N), borné 1-5.
export function parseDogsParam(value: string | undefined | null): number | null {
  const n = value ? parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, DOGS_MAX_LIMIT);
}
