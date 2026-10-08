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
  // Prix total saisi dans le champ « Prix total » de QuoteWidget (aussi
  // inscrit dans le texte), gardé pour un usage futur (recherche, tri,
  // paiement). Null pour une réponse « indisponible » et pour les devis
  // envoyés avant ce champ.
  priceCents: number | null;
  travelerFirstName: string | null;
};

// « 1 250 $ » / « 1 250,50 $ » en français (espace insécable avant le $),
// « $1,250 » en anglais — cents omis si ronds.
export function formatQuotePrice(cents: number, locale: string): string {
  const amount = cents / 100;
  const hasCents = cents % 100 !== 0;
  const options = { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 };
  if (locale === "en") return `$${amount.toLocaleString("en-CA", options)}`;
  return `${amount.toLocaleString("fr-CA", options)}\u00A0$`;
}

export const MAX_QUOTE_PRICE_CENTS = 100_000_000;

// Saisie libre du proprio (« 1250 », « 1 250,50 », « 1,250.50 $ ») → cents,
// ou null si vide/invalide.
export function parseQuotePrice(raw: string): number | null {
  let s = raw.replace(/[\s\u00A0\u202F$]/g, "");
  if (!s) return null;
  // Virgule suivie de 1-2 chiffres en fin de saisie = décimales (« 1250,50 ») ;
  // sinon séparateur de milliers (« 1,250 »).
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > 0 && cents <= MAX_QUOTE_PRICE_CENTS ? cents : null;
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
// Prix total (QuoteWidget seulement) — rempli depuis le champ « Prix total ».
export const PRICE_TOKEN = "{prix}";
// Ancien emplacement à remplacer à la main, encore présent dans les modèles
// sauvegardés avant le champ « Prix total » : converti en PRICE_TOKEN.
const LEGACY_PRICE_PLACEHOLDERS = /PRIX\s?\$|PRICE\s?\$/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type MessageTokenValues = {
  hostFirstName: string;
  hostLastName: string;
  travelerFirstName: string | null;
  listingTitle: string;
  datesGuestsBlock?: string | null;
  priceDisplay?: string | null;
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
  if (values.priceDisplay != null) {
    result = result.replace(LEGACY_PRICE_PLACEHOLDERS, PRICE_TOKEN).replace(PRICE_TOKEN, values.priceDisplay);
  }
  return result;
}

// Remet les vraies valeurs en jetons avant sauvegarde du modèle — pour qu'un
// futur envoi régénère toujours le bon voyageur/chalet/dates plutôt que de
// figer ceux de cette conversation précise.
export function tokenizeMessage(text: string, values: MessageTokenValues): string {
  let result = text;
  if (values.datesGuestsBlock) result = result.replace(values.datesGuestsBlock, DATES_GUESTS_TOKEN);
  if (values.priceDisplay) result = result.replace(values.priceDisplay, PRICE_TOKEN);
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
