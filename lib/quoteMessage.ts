// Le texte complet d'une réponse rapide (devis ou non-disponibilité) est
// assemblé et édité côté client (QuoteWidget.tsx / NoAvailabilityWidget.tsx)
// puis envoyé tel quel comme messages.content — ce fichier garde le type
// QuoteData (rendu visuel de components/messages/QuoteCard.tsx), le
// formatage prix, et les helpers de jeton partagés par les deux widgets.

export type QuoteReplyType = "quote" | "no_availability";

export type QuoteData = {
  type: QuoteReplyType;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number | null;
  numAdults: number | null;
  numChildren: number | null;
  numBabies: number | null;
  numPets: number | null;
  // Facultatif — aucun des deux widgets n'a de champ prix numérique séparé
  // (le prix, quand il y en a un, fait partie du texte libre).
  priceCents: number | null;
  travelerFirstName: string | null;
};

// Format québécois : espace avant le $, virgule décimale, cents omis si ronds.
export function formatPriceCad(cents: number): string {
  const amount = cents / 100;
  const hasCents = cents % 100 !== 0;
  const formatted = amount.toLocaleString("fr-CA", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} $`;
}

// Jeton littéral de signature — jamais traduit (un nom ne change pas de
// langue) : remplacé par le vrai prénom/nom du proprio à l'affichage,
// remis en jeton avant sauvegarde du modèle (voir tokenizeClosing ci-dessous).
export const SIGNATURE_TOKEN = "{prenomProprio} {nomProprio}";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detokenizeClosing(text: string, hostFirstName: string, hostLastName: string): string {
  return text.replace(/\{prenomProprio\}/g, hostFirstName).replace(/\{nomProprio\}/g, hostLastName);
}

// Remet {prenomProprio}/{nomProprio} en jetons avant sauvegarde — pour qu'un
// futur envoi (même si le nom du proprio changeait un jour) régénère
// toujours la bonne signature plutôt qu'un nom figé au moment de la sauvegarde.
export function tokenizeClosing(text: string, hostFirstName: string, hostLastName: string): string {
  let result = text;
  if (hostFirstName) result = result.replace(new RegExp(escapeRegExp(hostFirstName), "g"), "{prenomProprio}");
  if (hostLastName) result = result.replace(new RegExp(escapeRegExp(hostLastName), "g"), "{nomProprio}");
  return result;
}
