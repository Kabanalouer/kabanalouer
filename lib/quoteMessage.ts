// Assemble le texte de repli (fallback) d'un devis structuré envoyé par un
// proprio — stocké dans messages.content, affiché si jamais quote_data n'est
// pas rendu comme une carte quelque part. Voir components/messages/QuoteCard.tsx
// pour le rendu visuel réel côté fil de conversation.

export type QuoteData = {
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number | null;
  priceCents: number;
  travelerFirstName: string | null;
};

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

function formatDateEn(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS_EN[m - 1]} ${d}, ${y}`;
}

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

export function buildQuoteMessage(
  lang: "fr" | "en",
  params: {
    travelerFirstName: string | null;
    listingTitle: string;
    checkIn: string | null;
    checkOut: string | null;
    numGuests: number | null;
    priceCents: number;
  }
): string {
  const { travelerFirstName, listingTitle, checkIn, checkOut, numGuests, priceCents } = params;
  const price = formatPriceCad(priceCents);

  if (lang === "en") {
    const greeting = travelerFirstName ? `Hi ${travelerFirstName},` : "Hello,";
    const datesLine = checkIn
      ? `Here's your quote for ${listingTitle}, from ${formatDateEn(checkIn)}${checkOut ? ` to ${formatDateEn(checkOut)}` : ""}${numGuests ? ` for ${numGuests} traveler${numGuests > 1 ? "s" : ""}` : ""}.`
      : `Here's your quote for ${listingTitle}.`;
    return [greeting, "", datesLine, "", `Total price (taxes included): ${price}`].join("\n");
  }

  const greeting = travelerFirstName ? `Bonjour ${travelerFirstName},` : "Bonjour,";
  const datesLine = checkIn
    ? `Voici votre devis pour ${listingTitle}, du ${formatDateFr(checkIn)}${checkOut ? ` au ${formatDateFr(checkOut)}` : ""}${numGuests ? ` pour ${numGuests} voyageur${numGuests > 1 ? "s" : ""}` : ""}.`
    : `Voici votre devis pour ${listingTitle}.`;
  return [greeting, "", datesLine, "", `Prix total (taxes incluses) : ${price}`].join("\n");
}
