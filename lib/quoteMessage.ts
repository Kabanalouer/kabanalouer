// Le texte complet du devis est désormais assemblé et édité côté client
// (components/messages/QuoteWidget.tsx) puis envoyé tel quel comme
// messages.content — ce fichier ne garde que le type QuoteData (utilisé pour
// le rendu visuel de components/messages/QuoteCard.tsx) et le formatage prix.

export type QuoteData = {
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number | null;
  numAdults: number | null;
  numChildren: number | null;
  numBabies: number | null;
  numPets: number | null;
  // Redevenu facultatif — QuoteWidget.tsx n'a plus de champ prix numérique
  // séparé (le prix fait partie du texte libre du devis, voir Correction 2).
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
