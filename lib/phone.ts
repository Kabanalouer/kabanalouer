// Numéros de cellulaire nord-américains seulement (Twilio, lib/sms.ts).
// Retourne le format E.164 (+1XXXXXXXXXX), ou null si le numéro n'a pas
// 10 chiffres (11 avec l'indicatif 1).
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
