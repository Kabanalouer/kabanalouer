// FAQ de l'accueil (refonte SEO du 2026-11-27) : source unique des 10 questions et réponses, utilisée à la fois pour
// l'affichage (components/home/HomeFaq.tsx) et pour le JSON-LD FAQPage — le texte du JSON-LD est donc identique à celui
// affiché. Les liens s'écrivent en balisage [texte](cible) ; cibles : « theme:<clé> », « region:<slug> », « path:/… »
// ou « #ancre ». `plainText()` retire le balisage (JSON-LD). Typographie : U+00A0 avant « : » et dans « 24 h »,
// U+202F avant « ? ! ; », apostrophe typographique.

export interface FaqItem {
  id: string;
  fr: { q: string; a: string };
  en: { q: string; a: string };
}

export const FAQ_ACCUEIL: FaqItem[] = [
  {
    id: "comment-louer",
    fr: {
      q: "Comment louer un chalet au Québec avec Kabanalouer ?",
      a: "Choisissez un chalet, indiquez vos dates et le nombre de voyageurs, puis envoyez une demande de prix. Le propriétaire vous répond directement, par la messagerie ou par courriel, et vous vous entendez avec lui sur la réservation.",
    },
    en: {
      q: "How do I rent a cabin in Quebec with Kabanalouer?",
      a: "Pick a cabin, enter your dates and number of guests, then send a price request. The owner replies to you directly, by message or by email, and you agree with them on the booking.",
    },
  },
  {
    id: "cout",
    fr: {
      q: "Combien coûte la location d’un chalet au Québec ?",
      // Fourchette calculée le 2026-11-27 sur les fiches actives avec prix affiché (127 fiches) : 10e percentile 129 $,
      // médiane 220 $, 90e percentile 819 $. À revoir quand le nombre de fiches avec prix change beaucoup.
      a: "Sur Kabanalouer, les prix de départ affichés vont généralement de 130 $ à 820 $ la nuit, et la moitié des chalets sont sous les 220 $, selon la région, le nombre de chambres et les équipements. Le prix final dépend des dates et du nombre de voyageurs : les week-ends d’été, la relâche et le temps des fêtes coûtent plus cher. Vous payez le prix du propriétaire, sans frais de service ajoutés. Consultez le tableau des prix par région plus haut.",
    },
    en: {
      q: "How much does a cabin rental cost in Quebec?",
      a: "On Kabanalouer, the starting prices shown generally range from $130 to $820 per night, and half of the cabins are under $220, depending on the region, the number of bedrooms and the amenities. The final price depends on your dates and number of guests: summer weekends, spring break and the holidays cost more. You pay the owner’s price, with no service fees added. See the price table by region above.",
    },
  },
  {
    id: "frais",
    fr: {
      q: "Y a-t-il des frais de service pour les voyageurs ?",
      a: "Non. Kabanalouer ne facture ni frais de service aux voyageurs ni commission sur les réservations. Le prix que vous convenez avec le propriétaire est le prix que vous payez.",
    },
    en: {
      q: "Are there service fees for travellers?",
      a: "No. Kabanalouer charges travellers no service fees and takes no commission on bookings. The price you agree on with the owner is the price you pay.",
    },
  },
  {
    id: "securite",
    fr: {
      q: "Est-ce sécuritaire de louer un chalet directement au propriétaire ?",
      a: "Oui, avec quelques précautions. Échangez par la messagerie Kabanalouer, demandez un contrat de location et un reçu, et vérifiez que le propriétaire affiche son numéro d’enregistrement CITQ, obligatoire au Québec pour la location à court terme. Méfiez-vous de toute demande de paiement par carte-cadeau ou à une personne qui refuse de vous parler.",
    },
    en: {
      q: "Is it safe to rent a cabin directly from the owner?",
      a: "Yes, with a few precautions. Communicate through the Kabanalouer messaging, ask for a rental contract and a receipt, and check that the owner shows their CITQ registration number, which is mandatory in Quebec for short-term rentals. Be wary of any request to pay by gift card or to someone who refuses to talk to you.",
    },
  },
  {
    id: "quand",
    fr: {
      q: "Quand réserver un chalet pour l’été ou le temps des fêtes ?",
      a: "Le plus tôt possible : de 3 à 6 mois d’avance pour l’été et le temps des fêtes, de 2 à 3 mois pour la relâche. Les chalets avec spa ou au bord de l’eau partent en premier. Hors saison, en avril-mai et en novembre, on trouve plus facilement des disponibilités de dernière minute.",
    },
    en: {
      q: "When should I book a cabin for the summer or the holidays?",
      a: "As early as possible: 3 to 6 months ahead for the summer and the holidays, 2 to 3 months ahead for spring break. Cabins with a hot tub or on the water go first. Off-season, in April–May and in November, last-minute availability is easier to find.",
    },
  },
  {
    id: "compte",
    fr: {
      q: "Faut-il créer un compte pour demander un prix ?",
      a: "Non. Il suffit d’indiquer votre prénom et votre courriel en envoyant votre demande. Vous pouvez ensuite suivre la conversation, ou répondre directement au courriel de confirmation.",
    },
    en: {
      q: "Do I need an account to ask for a price?",
      a: "No. You only need to give your first name and email when you send your request. You can then follow the conversation, or reply directly to the confirmation email.",
    },
  },
  {
    id: "spa-montreal",
    fr: {
      q: "Où louer un chalet avec spa près de Montréal ?",
      a: "Les Laurentides, Lanaudière et les Cantons-de-l’Est regroupent la majorité des chalets avec spa à moins de 2 heures de Montréal. Près de Québec, regardez du côté de Charlevoix et de Portneuf. Le filtre « [Avec spa](theme:spa) » de la recherche les affiche tous.",
    },
    en: {
      q: "Where can I rent a cabin with a hot tub near Montreal?",
      a: "The Laurentians, Lanaudière and the Eastern Townships have most of the cabins with a hot tub within 2 hours of Montreal. Near Quebec City, look at Charlevoix and Portneuf. The “[With a hot tub](theme:spa)” filter in the search shows them all.",
    },
  },
  {
    id: "filtres",
    fr: {
      q: "Peut-on trouver un chalet qui accepte les chiens, avec spa ou au bord de l’eau ?",
      a: "Oui. Les filtres de la recherche permettent de cibler les chalets qui acceptent les chiens, avec spa, avec sauna, au bord de l’eau et plus encore.",
    },
    en: {
      q: "Can I find a cabin that accepts dogs, with a hot tub or on the water?",
      a: "Yes. The search filters let you target cabins that accept dogs, with a hot tub, with a sauna, on the waterfront and more.",
    },
  },
  {
    id: "airbnb",
    fr: {
      q: "Quelle est la différence entre Kabanalouer et Airbnb ?",
      a: "Sur Airbnb, la plateforme gère la réservation et ajoute des frais de service au voyageur. Sur Kabanalouer, vous contactez le propriétaire directement et réglez la location avec lui, sans frais de service ni commission. Vous payez donc le prix du propriétaire, rien de plus.",
    },
    en: {
      q: "What is the difference between Kabanalouer and Airbnb?",
      a: "On Airbnb, the platform handles the booking and adds service fees for the traveller. On Kabanalouer, you contact the owner directly and settle the rental with them, with no service fees or commission. You pay the owner’s price, nothing more.",
    },
  },
  {
    id: "regions",
    fr: {
      q: "Dans quelles régions du Québec trouve-t-on des chalets ?",
      a: "Les chalets se trouvent dans plusieurs régions du Québec, dont les Laurentides, Charlevoix, l’Estrie, Lanaudière, l’Outaouais et la Mauricie. Les chalets disponibles varient selon la région : consultez la page de chaque région pour voir les fiches en ligne.",
    },
    en: {
      q: "Which regions of Quebec have cabins?",
      a: "Cabins are located in several regions of Quebec, including the Laurentians, Charlevoix, the Eastern Townships, Lanaudière, the Outaouais and the Mauricie. Available cabins vary by region: check each region’s page to see the listings online.",
    },
  },
];

// Texte brut (sans le balisage des liens) : sert au JSON-LD, identique au texte affiché.
export function plainText(markup: string): string {
  return markup.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
