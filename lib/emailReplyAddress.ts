import crypto from "crypto";

// Partagé entre lib/emails/newMessageNotification.ts (crée/réutilise l'adresse
// pour le Reply-To) et app/api/webhooks/resend-inbound/route.ts (retrouve la
// ligne à partir du token reçu) — Phase 2b.

export const REPLY_DOMAIN = "reply.kabanalouer.ca";

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

// Court, contrairement à lib/reviewToken.ts (32 octets → 64 caractères hex) :
// ce token se retrouve dans le local-part d'une adresse courriel
// (conv-{token}@reply.kabanalouer.ca), limité à 64 caractères par RFC 5321
// §4.5.3.1.1. 16 octets (32 caractères hex) laisse une large marge tout en
// gardant 128 bits d'entropie — largement suffisant, l'unicité est de toute
// façon imposée par la contrainte UNIQUE en base.
export function generateReplyToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildReplyToAddress(token: string): string {
  return `conv-${token}@${REPLY_DOMAIN}`;
}

const REPLY_ADDRESS_PATTERN = new RegExp(
  `^conv-([a-f0-9]+)@${REPLY_DOMAIN.replace(/\./g, "\\.")}$`,
  "i"
);

// Un courriel reçu peut être adressé à plusieurs destinataires (to/cc) —
// on prend la première adresse conv-* reconnue, peu importe sa position.
export function extractReplyToken(addresses: string[]): string | null {
  for (const raw of addresses) {
    const address = extractEmailAddress(raw);
    const match = address.match(REPLY_ADDRESS_PATTERN);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

// Les en-têtes "From"/"To" d'un vrai courriel arrivent souvent sous la forme
// `Nom Complet <adresse@domaine.com>` plutôt que l'adresse nue.
export function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function normalizeUserPair(userAId: string, userBId: string): [string, string] {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

// Cherche la ligne existante pour ce trio (listing + paire d'utilisateurs
// normalisée), ou la crée si c'est la première fois que ces deux personnes
// échangent sur cette annonce.
export async function getOrCreateEmailReplyAddress(
  admin: AdminClient,
  { listingId, userAId, userBId }: { listingId: string; userAId: string; userBId: string }
): Promise<{ token: string } | { error: string }> {
  const [normA, normB] = normalizeUserPair(userAId, userBId);

  const { data: existing } = await admin
    .from("email_reply_addresses")
    .select("token")
    .eq("listing_id", listingId)
    .eq("user_a_id", normA)
    .eq("user_b_id", normB)
    .maybeSingle();

  if (existing?.token) return { token: existing.token as string };

  const token = generateReplyToken();
  const { data: inserted, error } = await admin
    .from("email_reply_addresses")
    .insert({ listing_id: listingId, user_a_id: normA, user_b_id: normB, token })
    .select("token")
    .single();

  if (!error && inserted) return { token: inserted.token as string };

  // Conflit de course (deux envois concurrents pour la même paire, ex. deux
  // groupes de messages traités par le même passage de cron) — la ligne a
  // été créée entre notre lecture et notre écriture, on la relit plutôt que
  // d'échouer.
  if (error?.code === "23505") {
    const { data: raceRow } = await admin
      .from("email_reply_addresses")
      .select("token")
      .eq("listing_id", listingId)
      .eq("user_a_id", normA)
      .eq("user_b_id", normB)
      .maybeSingle();
    if (raceRow?.token) return { token: raceRow.token as string };
  }

  console.error("getOrCreateEmailReplyAddress: échec", error);
  return { error: "Échec de la création de l'adresse de réponse" };
}

const AUTO_REPLY_SUBJECT_PATTERNS = [
  "out of office",
  "auto-reply",
  "auto reply",
  "automatic reply",
  "réponse automatique",
  "reponse automatique",
  "absence du bureau",
  "message d'absence",
];

// Détection best-effort d'une réponse automatique (absence/vacances) — voir
// architecture Phase 2b. Aucune norme unique n'existe pour ces en-têtes,
// donc on vérifie les plus courants plutôt qu'un seul.
export function isAutoReply(headers: Record<string, string> | null | undefined, subject: string | null | undefined): boolean {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  const autoSubmitted = lowerHeaders["auto-submitted"];
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") return true;
  if (lowerHeaders["x-autoreply"] || lowerHeaders["x-autorespond"]) return true;

  const subjectLower = (subject ?? "").toLowerCase();
  return AUTO_REPLY_SUBJECT_PATTERNS.some((pattern) => subjectLower.includes(pattern));
}
