// Le texte complet d'une réponse rapide (devis ou non-disponibilité) est
// assemblé et édité côté client (QuoteWidget.tsx / NoAvailabilityWidget.tsx)
// puis envoyé tel quel comme messages.content — ce fichier garde le type
// QuoteData (rendu visuel de components/messages/QuoteCard.tsx), le
// formatage prix, et les jetons/helpers de (dé)tokenisation partagés par les
// deux widgets. Le modèle sauvegardé (quote_template_closing /
// no_availability_template_closing) couvre maintenant le MESSAGE ENTIER
// (salutation, intro, section personnalisable) — plus seulement la
// fermeture — pour que toute édition du proprio, où qu'elle soit dans le
// texte, soit mémorisée pour la prochaine fois.

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
  return `${formatted} $`;
}

// Jetons littéraux — jamais traduits (un nom/titre ne change pas de langue) :
// remplacés par les vraies valeurs de la conversation en cours à l'affichage,
// remis en jetons avant sauvegarde du modèle (voir detokenizeMessage/
// tokenizeMessage ci-dessous).
export const SIGNATURE_TOKEN = "{prenomProprio} {nomProprio}";
export const TRAVELER_FIRST_NAME_TOKEN = "{prenomVoyageur}";
export const LISTING_TITLE_TOKEN = "{titreChalet}";
// Bloc dates + voyageurs (QuoteWidget seulement) — jamais figé dans le
// modèle, toujours régénéré depuis les vraies données de CHAQUE demande.
export const DATES_GUESTS_TOKEN = "{datesEtVoyageurs}";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type MessageTokenValues = {
  hostFirstName: string;
  hostLastName: string;
  travelerFirstName: string | null;
  listingTitle: string;
  datesGuestsBlock?: string | null;
};

// Remplace tous les jetons par les vraies valeurs de la conversation en
// cours — utilisé pour afficher le modèle sauvegardé (ou le gabarit par
// défaut) au chargement du widget.
export function detokenizeMessage(text: string, values: MessageTokenValues): string {
  let result = text
    .replace(/\{prenomProprio\}/g, values.hostFirstName)
    .replace(/\{nomProprio\}/g, values.hostLastName)
    .replace(new RegExp(escapeRegExp(LISTING_TITLE_TOKEN), "g"), values.listingTitle)
    .replace(new RegExp(escapeRegExp(TRAVELER_FIRST_NAME_TOKEN), "g"), values.travelerFirstName ?? "");
  if (values.datesGuestsBlock != null) {
    result = result.replace(DATES_GUESTS_TOKEN, values.datesGuestsBlock);
  }
  return result;
}

// Remet les vraies valeurs en jetons avant sauvegarde du modèle — pour qu'un
// futur envoi régénère toujours le bon voyageur/chalet/dates plutôt que de
// figer ceux de cette conversation précise.
export function tokenizeMessage(text: string, values: MessageTokenValues): string {
  let result = text;
  if (values.datesGuestsBlock) result = result.replace(values.datesGuestsBlock, DATES_GUESTS_TOKEN);
  // Remplace d'abord le nom complet du proprio (prénom + nom accolés, tel
  // qu'il apparaît dans la signature) comme un seul bloc — avant toute
  // substitution individuelle. Sans ça, un voyageur qui partage le même
  // prénom que le proprio (cas réel, pas juste théorique) ferait consommer
  // l'occurrence de la signature par le jeton {prenomVoyageur} en premier,
  // corrompant la signature sauvegardée.
  if (values.hostFirstName && values.hostLastName) {
    const fullHostName = `${values.hostFirstName} ${values.hostLastName}`;
    result = result.replace(new RegExp(escapeRegExp(fullHostName), "g"), SIGNATURE_TOKEN);
  }
  if (values.listingTitle) result = result.replace(new RegExp(escapeRegExp(values.listingTitle), "g"), LISTING_TITLE_TOKEN);
  if (values.travelerFirstName) result = result.replace(new RegExp(escapeRegExp(values.travelerFirstName), "g"), TRAVELER_FIRST_NAME_TOKEN);
  if (values.hostFirstName) result = result.replace(new RegExp(escapeRegExp(values.hostFirstName), "g"), "{prenomProprio}");
  if (values.hostLastName) result = result.replace(new RegExp(escapeRegExp(values.hostLastName), "g"), "{nomProprio}");
  return result;
}
