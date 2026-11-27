// Textes des sections SEO de l'accueil (refonte du 2026-11-27) : « Louer un chalet au Québec… », la carte des prix par
// région et l'en-tête de la FAQ (les questions sont dans lib/faqAccueil.ts). Liens en balisage [texte](cible), voir
// lib/faqAccueil.ts. Typographie : U+00A0 avant « : », « $ », « % » ; U+202F avant « ? ! ; » ; apostrophe ’.
// Le « 148 $ » et les « 2 nuits » du premier bloc sont ceux du comparatif (components/PriceComparison.tsx) : à
// mettre à jour ensemble.

export interface SeoBlock {
  title: string;
  body: string;
}

export interface HomeSeoContent {
  title: string;
  lead: string;
  blocks: SeoBlock[];
  card: {
    eyebrow: string;
    title: string;
    subtitle: string;
    caption: string;
    colRegion: string;
    colPrice: string;
    pricedCount: (n: number) => string;
    perNight: string;
    cheapest: (name: string) => string;
    note: (date: string) => string;
    seeAll: (n: number) => string;
  };
  faq: { title: string; contactBefore: string; contactLink: string };
}

export const HOME_SEO: { fr: HomeSeoContent; en: HomeSeoContent } = {
  fr: {
    title: "Louer un chalet au Québec, directement avec le propriétaire",
    lead: "Kabanalouer est la plateforme de location de chalet au Québec où vous écrivez directement aux propriétaires. Aucuns frais de service pour les voyageurs, aucune commission sur les réservations : vous discutez du prix, des dates et des détails avec la personne qui vous accueille.",
    blocks: [
      {
        title: "Pourquoi c’est moins cher en direct",
        body: "Les grandes plateformes ajoutent de 10 à 15 % de frais de service au total du séjour, au moment de payer. Ici, le prix est celui du propriétaire. Pour 2 nuits dans les Laurentides, l’écart peut atteindre 148 $. [Voir la comparaison →](#comparatif)",
      },
      {
        title: "Trouver le chalet qui vous ressemble",
        body: "Un [chalet avec spa](theme:spa) pour un week-end à deux, un [chalet au bord de l’eau](theme:waterfront) pour l’été, un [chalet qui accepte les chiens](theme:dogs) ou un [chalet pour le télétravail](theme:remote-work) : filtrez par région, dates, nombre de voyageurs et équipements. Chaque fiche présente les chambres, les règlements et les activités à proximité.",
      },
      {
        title: "Quelle région choisir ?",
        body: "Les [Laurentides](region:laurentides) et [Lanaudière](region:lanaudiere) pour une escapade à une heure de Montréal. [Charlevoix](region:charlevoix) et la [région de Québec](region:quebec) pour le fleuve et les grands espaces. Les [Cantons-de-l’Est](region:cantons-de-lest) pour les lacs, les vignobles et le ski. L’[Outaouais](region:outaouais) pour les lacs sauvages, près de Gatineau et d’Ottawa.",
      },
    ],
    card: {
      eyebrow: "Données Kabanalouer",
      title: "Combien coûte un chalet au Québec ?",
      subtitle: "Prix de départ moyen par nuit, selon la région",
      caption: "Prix de départ moyen par nuit d’un chalet selon la région au Québec",
      colRegion: "Région",
      colPrice: "À partir de",
      pricedCount: (n) => `${n} chalets avec prix`,
      perNight: "/ nuit",
      cheapest: (name) => `${name} a les prix de départ les plus bas.`,
      note: (date) =>
        `Moyenne des prix « à partir de » affichés sur les fiches actives. Le prix final dépend des dates et du nombre de voyageurs. Mis à jour le ${date}.`,
      seeAll: (n) => `Voir les ${n} régions →`,
    },
    faq: {
      title: "Questions fréquentes sur la location de chalet",
      contactBefore: "Une autre question ?",
      contactLink: "Écrivez-nous",
    },
  },
  en: {
    title: "Rent a cabin in Quebec, directly from the owner",
    lead: "Kabanalouer is the Quebec cabin rental platform where you write directly to owners. No service fees for travellers and no commission on bookings: you discuss price, dates and details with the person who welcomes you.",
    blocks: [
      {
        title: "Why it costs less when you book direct",
        body: "Big platforms add 10 to 15% in service fees to the total of your stay, at checkout. Here, the price is the owner’s. For 2 nights in the Laurentians, the difference can reach $148. [See the comparison →](#comparatif)",
      },
      {
        title: "Find the cabin that suits you",
        body: "A [cabin with a hot tub](theme:spa) for a weekend for two, a [waterfront cabin](theme:waterfront) for the summer, a [dog-friendly cabin](theme:dogs) or a [cabin for remote work](theme:remote-work): filter by region, dates, number of guests and amenities. Each listing shows the bedrooms, the rules and the activities nearby.",
      },
      {
        title: "Which region should you choose?",
        body: "The [Laurentians](region:laurentides) and [Lanaudière](region:lanaudiere) for a getaway an hour from Montreal. [Charlevoix](region:charlevoix) and the [Quebec City region](region:quebec) for the river and wide-open spaces. The [Eastern Townships](region:cantons-de-lest) for lakes, vineyards and skiing. The [Outaouais](region:outaouais) for wild lakes, near Gatineau and Ottawa.",
      },
    ],
    card: {
      eyebrow: "Kabanalouer data",
      title: "How much does a cabin cost in Quebec?",
      subtitle: "Average starting price per night, by region",
      caption: "Average starting price per night of a cabin by region in Quebec",
      colRegion: "Region",
      colPrice: "From",
      pricedCount: (n) => `${n} cabins with a price`,
      perNight: "/ night",
      cheapest: (name) => `${name} has the lowest starting prices.`,
      note: (date) =>
        `Average of the “from” prices shown on active listings. The final price depends on your dates and number of guests. Updated ${date}.`,
      seeAll: (n) => `See all ${n} regions →`,
    },
    faq: {
      title: "Frequently asked questions about cabin rentals",
      contactBefore: "Another question?",
      contactLink: "Write to us",
    },
  },
};
