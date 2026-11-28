// Contenu éditorial propre à une région, un champ par thème (60 à 100 mots chacun). Texte vide = bloc non affiché :
// jamais de texte générique de remplacement (il serait identique d'une région à l'autre).
export interface RegionContent {
  slug: string;
  name: string;
  // « dans les Laurentides »
  preposition: string;
  waterIntro: string;
  spaIntro: string;
  dogsIntro: string;
  saunaIntro: string;
  remoteIntro: string;
  billiardIntro: string;
  chargerIntro: string;
  accessibleIntro: string;
  dealsIntro: string;
}
