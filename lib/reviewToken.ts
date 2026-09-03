import crypto from "crypto";

// Token à usage unique par action, inclus dans les liens des courriels de
// relance d'avis — permet au voyageur d'agir sans jamais avoir à se connecter.
// L'anti-rejeu est géré par état (echange_submitted_at / status), pas par
// invalidation globale du token dès le premier clic : le même lien sert au
// choix initial ET, plus tard, à la soumission de l'avis de séjour.

const TOKEN_TTL_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000; // 30 jours

export function generateReviewToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// L'expiration ne peut pas être fixée à "30 jours après l'envoi" seulement :
// si le séjour a lieu longtemps après la demande de devis/premier contact,
// le lien "J'ai réservé" doit rester valide jusqu'à 30 jours APRÈS le
// check_out (le voyageur doit encore pouvoir soumettre l'avis de séjour à ce
// moment-là). Sans check_out connu, on retombe sur 30 jours après l'envoi.
export function computeTokenExpiresAt(checkOut: string | null, from: Date = new Date()): string {
  const base = checkOut ? new Date(Math.max(new Date(`${checkOut}T00:00:00Z`).getTime(), from.getTime())) : from;
  return new Date(base.getTime() + TOKEN_TTL_MS_DEFAULT).toISOString();
}

export type ReviewRequestRow = {
  id: string;
  listing_id: string;
  traveler_id: string;
  host_id: string;
  status: "prompted" | "awaiting_stay_review" | "stay_prompted" | "completed" | "expired";
  check_out: string | null;
  token: string;
  token_expires_at: string;
  echange_submitted_at: string | null;
  prompted_at: string | null;
  stay_prompted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TokenLookupResult =
  | { ok: true; reviewRequest: ReviewRequestRow }
  | { ok: false; reason: "not_found" | "expired" };

// admin: client Supabase service-role (jamais le client scoped-session — le
// voyageur n'a pas de session dans ce flux).
export async function getReviewRequestByToken(
  admin: { from: (table: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  token: string
): Promise<TokenLookupResult> {
  const { data } = await admin
    .from("review_requests")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };

  const row = data as ReviewRequestRow;
  if (row.status === "expired" || new Date(row.token_expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, reviewRequest: row };
}
