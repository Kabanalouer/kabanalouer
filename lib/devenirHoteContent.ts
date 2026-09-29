// Textes de la page /devenir-hote (et /en/become-a-host).
// FR : validés par le client, repris mot pour mot du prototype
// landing-page-proprio/ — ne pas reformuler. Espaces insécables : U+202F
// avant ? ! ; U+00A0 avant : et dans « 350 $ », « 31 octobre 2026 ».
// La FAQ sert aussi au JSON-LD FAQPage (app/devenir-hote/page.tsx).

export type Faq = { q: string; a: string };

export type DevenirHoteContent = {
  header: { questions: string; login: string; publish: string };
  hero: {
    badge: string;
    h1Line1: string;
    h1Pre: string;
    h1Accent: string;
    h1Post: string;
    subtitle: string;
    ctaCreate: string;
    ctaDuplicate: string;
    note: string;
    cardPill: string;
  };
  importSection: {
    eyebrow: string;
    h2: string;
    subtitle: string;
    label: string;
    placeholder: string;
    submit: string;
    error: string;
    noAirbnb: string;
    createFromScratch: string;
    steps: { title: string; text: string }[];
  };
  free: {
    eyebrow: string;
    h2: string;
    subtitle: string;
    regularLabel: string;
    regularPrice: string;
    offerLabel: string;
    offerPricePre: string;
    offerPriceSup: string;
    offerPricePost: string;
    points: string[];
  };
  calculator: {
    title: string;
    subtitle: string;
    priceLabel: string;
    nightsLabel: string;
    nightsUnit: string;
    commissionLabel: string;
    commissionNote: string;
    kabanalouerLabel: string;
    kabanalouerNote: string;
    pocketPre: string;
    pocketPost: string;
    cta: string;
  };
  features: {
    eyebrow: string;
    h2: string;
    badge: string;
    aiTitle: string;
    aiText: string;
    chatQuestion: string;
    chatAnswer: string;
    chatCardTitle: string;
    chatCardMeta: string;
    items: { title: string; text: string }[];
  };
  compare: {
    h2: string;
    criterion: string;
    us: string;
    them: string;
    rows: { label: string; us: string; them: string }[];
  };
  faq: { h2: string; items: Faq[] };
  finalCta: {
    h2: string;
    subtitle: string;
    importBtn: string;
    createBtn: string;
    reassurance: string;
  };
  sticky: { title: string; subtitle: string; cta: string };
};

const fr: DevenirHoteContent = {
  header: { questions: "Questions", login: "Connexion", publish: "Publier gratuitement" },
  hero: {
    badge: "Offre de lancement · Inscrivez-vous avant le 31 octobre 2026",
    h1Line1: "Annoncez votre chalet.",
    h1Pre: "C’est ",
    h1Accent: "gratuit",
    h1Post: ".",
    subtitle:
      "C’est gratuit la première année et sans engagement. Aucune commission sur vos réservations. Aucuns frais de transaction. Ce que vos voyageurs paient, vous le gardez en entier.",
    ctaCreate: "Créer mon annonce",
    ctaDuplicate: "Dupliquer depuis Airbnb",
    note: "12 mois gratuits pour toute inscription avant le 31 octobre 2026.",
    cardPill: "Sur Kabanalouer",
  },
  importSection: {
    eyebrow: "Duplication d’annonce Airbnb",
    h2: "Déjà sur Airbnb ? Un lien suffit pour dupliquer votre annonce.",
    subtitle:
      "Photos, description, équipements, capacité et règlement : tout est repris automatiquement. Ne réécrivez rien.",
    label: "Collez le lien de votre annonce Airbnb",
    placeholder: "airbnb.ca/rooms/12345678",
    submit: "Importer mon annonce",
    error: "Collez un lien d’annonce Airbnb (ex. airbnb.ca/rooms/12345678).",
    noAirbnb: "Pas sur Airbnb ?",
    createFromScratch: "Créer une annonce de zéro",
    steps: [
      { title: "Collez votre lien", text: "Copiez l’adresse de votre annonce depuis Airbnb et collez-la ici." },
      { title: "Vérifiez votre fiche", text: "Complétez votre fiche avec les informations dupliquées." },
      { title: "Publiez", text: "Votre chalet est visible par les voyageurs et les assistants IA." },
    ],
  },
  free: {
    eyebrow: "Gratuit la première année",
    h2: "Ce que vous louez, vous le gardez. En entier.",
    subtitle:
      "Pas d’abonnement pendant 12 mois, pas de commission, pas de frais de transaction. Les voyageurs vous contactent et vous paient directement.",
    regularLabel: "Forfaits réguliers",
    regularPrice: "199 $ à 399 $/an",
    offerLabel: "Offre de lancement",
    offerPricePre: "0 $ la 1",
    offerPriceSup: "re",
    offerPricePost: " année",
    points: [
      "12 mois gratuits, sans engagement",
      "Aucune commission sur vos réservations",
      "Aucuns frais de transaction, ni pour vous ni pour vos voyageurs",
    ],
  },
  calculator: {
    title: "Combien vous économisez",
    subtitle: "Estimation sur une année de location",
    priceLabel: "Prix moyen par nuit",
    nightsLabel: "Nuits louées par année",
    nightsUnit: "nuits",
    commissionLabel: "Plateformes à commission",
    commissionNote: "≈ 15 % de frais",
    kabanalouerLabel: "Kabanalouer",
    kabanalouerNote: "la première année",
    pocketPre: "Dans vos poches : ",
    pocketPost: " de plus",
    cta: "Commencer gratuitement",
  },
  features: {
    eyebrow: "Et une fois en ligne",
    h2: "Plus de visibilité, moins de gestion.",
    badge: "Nouveau",
    aiTitle: "Trouvé par ChatGPT et les autres assistants IA.",
    aiText:
      "De plus en plus de voyageurs demandent à une IA où dormir. Kabanalouer structure la fiche de votre chalet pour que ChatGPT, Gemini, Perplexity et les autres puissent la lire, la comprendre et la recommander.",
    chatQuestion: "Un chalet avec spa près de Tremblant pour 8 personnes, la fin de semaine du 14 février ?",
    chatAnswer: "Voici une option qui correspond à vos critères :",
    chatCardTitle: "Votre chalet",
    chatCardMeta: "Mont-Tremblant · 8 voyageurs · spa",
    items: [
      {
        title: "Devis automatiques",
        text: "Votre modèle de devis s’enregistre dans vos réponses automatiques. Vous n’avez qu’à ajuster le prix selon la demande et à l’envoyer.",
      },
      {
        title: "Messagerie intégrée",
        text: "Toutes vos conversations avec les voyageurs au même endroit, sur ordinateur comme sur mobile.",
      },
      {
        title: "Zéro commission",
        text: "Aucun pourcentage sur vos réservations et aucuns frais de transaction. Le prix affiché est le prix que vous recevez.",
      },
    ],
  },
  compare: {
    h2: "Kabanalouer, en complément de vos autres plateformes",
    criterion: "Critère",
    us: "Kabanalouer",
    them: "Plateformes à commission",
    rows: [
      { label: "Coût la première année", us: "0 $", them: "Frais sur chaque réservation" },
      { label: "Commission sur les réservations", us: "0 %", them: "3 à 15 %+" },
      { label: "Frais de transaction", us: "Aucuns", them: "Oui" },
      { label: "Import d’annonce Airbnb", us: "✓", them: "—" },
      { label: "Devis automatiques", us: "✓", them: "—" },
      { label: "Fiche optimisée pour les IA", us: "✓", them: "—" },
    ],
  },
  faq: {
    h2: "Vos questions",
    items: [
      {
        q: "C’est vraiment gratuit ?",
        a: "Oui. Pendant les 12 premiers mois, publier votre chalet ne coûte rien : pas d’abonnement, pas de commission sur vos réservations, pas de frais de transaction. Aucune carte de crédit n’est demandée à l’inscription.",
      },
      {
        q: "Jusqu’à quand puis-je profiter de l’offre ?",
        a: "L’offre de lancement s’applique à toute inscription faite avant le 31 octobre 2026. Vos 12 mois gratuits commencent à votre inscription.",
      },
      {
        q: "Que se passe-t-il après la première année ?",
        a: "Vous serez avisé avant la fin de votre période gratuite et vous choisirez librement de continuer avec l’un de nos forfaits, de 199 $ à 399 $ par année. Aucun renouvellement automatique : sans action de votre part, rien n’est facturé. Aucune carte de crédit n’est demandée pendant la première année.",
      },
      {
        q: "Dois-je quitter Airbnb ?",
        a: "Non. Kabanalouer s’ajoute à vos autres plateformes. L’import copie votre annonce sans rien modifier sur Airbnb.",
      },
      {
        q: "Qu’est-ce qui est importé depuis mon annonce Airbnb ?",
        a: "Vos photos, votre titre, votre description, vos équipements, la capacité et le règlement de la maison. Vous pouvez tout revoir et modifier avant de publier.",
      },
      {
        q: "Comment suis-je payé sans frais de transaction ?",
        a: "Les voyageurs réservent et vous paient directement. Kabanalouer ne prend aucun pourcentage. Vous êtes en contact direct avec les voyageurs.",
      },
      {
        q: "Comment fonctionnent les devis automatiques ?",
        a: "Vous créez une fois votre modèle de devis, qui s’enregistre dans vos réponses automatiques. À chaque demande, vous ajustez le prix selon les dates et le nombre de voyageurs, puis vous l’envoyez en un clic.",
      },
    ],
  },
  finalCta: {
    h2: "Votre chalet en ligne aujourd’hui. C’est gratuit pendant 1 an.",
    subtitle: "Offre de lancement valable pour toute inscription avant le 31 octobre 2026.",
    importBtn: "Importer mon annonce Airbnb",
    createBtn: "Créer une annonce de zéro",
    reassurance: "Aucune carte de crédit · Aucune commission · Aucun engagement",
  },
  sticky: { title: "Gratuit 12 mois", subtitle: "Avant le 31 oct. 2026", cta: "Publier mon chalet" },
};

// EN : traduction maison (non fournie par le client), à faire valider.
const en: DevenirHoteContent = {
  header: { questions: "Questions", login: "Log in", publish: "List for free" },
  hero: {
    badge: "Launch offer · Sign up before October 31, 2026",
    h1Line1: "List your cabin.",
    h1Pre: "It’s ",
    h1Accent: "free",
    h1Post: ".",
    subtitle:
      "Free for the first year, no commitment. No commission on your bookings. No transaction fees. What your guests pay, you keep in full.",
    ctaCreate: "Create my listing",
    ctaDuplicate: "Copy from Airbnb",
    note: "12 months free for every sign-up before October 31, 2026.",
    cardPill: "On Kabanalouer",
  },
  importSection: {
    eyebrow: "Airbnb listing copy",
    h2: "Already on Airbnb? One link is all it takes to copy your listing.",
    subtitle:
      "Photos, description, amenities, capacity and house rules: everything is brought over automatically. No rewriting.",
    label: "Paste your Airbnb listing link",
    placeholder: "airbnb.ca/rooms/12345678",
    submit: "Import my listing",
    error: "Paste an Airbnb listing link (e.g. airbnb.ca/rooms/12345678).",
    noAirbnb: "Not on Airbnb?",
    createFromScratch: "Create a listing from scratch",
    steps: [
      { title: "Paste your link", text: "Copy your listing’s address from Airbnb and paste it here." },
      { title: "Review your listing", text: "Complete your listing with the copied information." },
      { title: "Publish", text: "Your cabin is visible to travelers and AI assistants." },
    ],
  },
  free: {
    eyebrow: "Free for the first year",
    h2: "What you earn, you keep. In full.",
    subtitle:
      "No subscription for 12 months, no commission, no transaction fees. Travelers contact you and pay you directly.",
    regularLabel: "Regular plans",
    regularPrice: "$199 to $399/year",
    offerLabel: "Launch offer",
    offerPricePre: "$0 the 1",
    offerPriceSup: "st",
    offerPricePost: " year",
    points: [
      "12 months free, no commitment",
      "No commission on your bookings",
      "No transaction fees, for you or your guests",
    ],
  },
  calculator: {
    title: "How much you save",
    subtitle: "Estimate over one year of rentals",
    priceLabel: "Average price per night",
    nightsLabel: "Nights booked per year",
    nightsUnit: "nights",
    commissionLabel: "Commission platforms",
    commissionNote: "≈ 15% in fees",
    kabanalouerLabel: "Kabanalouer",
    kabanalouerNote: "the first year",
    pocketPre: "In your pocket: ",
    pocketPost: " more",
    cta: "Start for free",
  },
  features: {
    eyebrow: "And once you’re online",
    h2: "More visibility, less work.",
    badge: "New",
    aiTitle: "Found by ChatGPT and other AI assistants.",
    aiText:
      "More and more travelers ask an AI where to stay. Kabanalouer structures your cabin’s listing so ChatGPT, Gemini, Perplexity and others can read it, understand it and recommend it.",
    chatQuestion: "A cabin with a hot tub near Tremblant for 8 people, the weekend of February 14?",
    chatAnswer: "Here’s an option that matches your criteria:",
    chatCardTitle: "Your cabin",
    chatCardMeta: "Mont-Tremblant · 8 travelers · hot tub",
    items: [
      {
        title: "Automatic quotes",
        text: "Your quote template is saved in your quick replies. Just adjust the price for each request and send it.",
      },
      {
        title: "Built-in messaging",
        text: "All your conversations with travelers in one place, on desktop and mobile.",
      },
      {
        title: "Zero commission",
        text: "No percentage on your bookings and no transaction fees. The price shown is the price you receive.",
      },
    ],
  },
  compare: {
    h2: "Kabanalouer, alongside your other platforms",
    criterion: "Criterion",
    us: "Kabanalouer",
    them: "Commission platforms",
    rows: [
      { label: "Cost the first year", us: "$0", them: "Fees on every booking" },
      { label: "Commission on bookings", us: "0%", them: "3 to 15%+" },
      { label: "Transaction fees", us: "None", them: "Yes" },
      { label: "Airbnb listing import", us: "✓", them: "—" },
      { label: "Automatic quotes", us: "✓", them: "—" },
      { label: "AI-optimized listing", us: "✓", them: "—" },
    ],
  },
  faq: {
    h2: "Your questions",
    items: [
      {
        q: "Is it really free?",
        a: "Yes. For the first 12 months, listing your cabin costs nothing: no subscription, no commission on your bookings, no transaction fees. No credit card is required to sign up.",
      },
      {
        q: "Until when can I take advantage of the offer?",
        a: "The launch offer applies to every sign-up made before October 31, 2026. Your 12 free months start when you sign up.",
      },
      {
        q: "What happens after the first year?",
        a: "You’ll be notified before your free period ends and you’ll be free to continue with one of our plans, from $199 to $399 per year. No automatic renewal: if you do nothing, nothing is charged. No credit card is required during the first year.",
      },
      {
        q: "Do I have to leave Airbnb?",
        a: "No. Kabanalouer is added to your other platforms. The import copies your listing without changing anything on Airbnb.",
      },
      {
        q: "What is imported from my Airbnb listing?",
        a: "Your photos, title, description, amenities, capacity and house rules. You can review and edit everything before publishing.",
      },
      {
        q: "How do I get paid without transaction fees?",
        a: "Travelers book and pay you directly. Kabanalouer takes no percentage. You’re in direct contact with travelers.",
      },
      {
        q: "How do automatic quotes work?",
        a: "You create your quote template once, and it’s saved in your quick replies. For each request, you adjust the price for the dates and number of travelers, then send it in one click.",
      },
    ],
  },
  finalCta: {
    h2: "Your cabin online today. Free for 1 year.",
    subtitle: "Launch offer valid for every sign-up before October 31, 2026.",
    importBtn: "Import my Airbnb listing",
    createBtn: "Create a listing from scratch",
    reassurance: "No credit card · No commission · No commitment",
  },
  sticky: { title: "Free for 12 months", subtitle: "Before Oct. 31, 2026", cta: "List my cabin" },
};

export function getDevenirHoteContent(locale: string): DevenirHoteContent {
  return locale === "en" ? en : fr;
}
