// Contenu éditorial d'une page thème (gabarit ThemeLandingPage). Un fichier par thème dans content/themes/.
// Variables remplacées au rendu (voir lib/themeStats.ts et ThemeLandingPage.tsx) : {N}, {lieu}, {prixMin}, {prixP10},
// {prixP90}, {topRegions}, {topVilles}, {nLaurentides}, {nLanaudiere}, {nQuebec}, {villesMontreal}, {villesQuebec},
// {nChiens}, {lienChiens}.

// Texte à fournir par Simon : tant que `guide` ou `faq` en contient, la nouvelle version du thème reste désactivée.
export const TO_PROVIDE = "[À FOURNIR]" as const;
export type ToProvide = typeof TO_PROVIDE;

export interface ThemeGuideBlock {
  h3: string;
  p: string;
}

export interface ThemeGuide {
  title: string;
  intro: string;
  blocks: ThemeGuideBlock[];
}

export interface ThemeFaqItem {
  q: string;
  a: string;
  // national : question posée seulement sur la page nationale ; local : seulement région ou ville ; sinon partout
  scope?: "national" | "local";
  // Réponse quand le nombre de chalets concernés est nul (question « chiens »)
  aNone?: string;
}

export interface ThemeContent {
  slug: string;
  // « au bord de l'eau » (se place après « chalet »)
  label: string;
  // « chalets au bord de l'eau »
  labelPlural: string;
  // Libellé court du fil d'Ariane : « Au bord de l'eau »
  breadcrumbLabel: string;
  h1Base: string;
  // Nouvelle version du gabarit activée pour ce thème (contenu fourni)
  active: boolean;
  // Paragraphe éditorial du tableau par région (page nationale)
  nationalRegionParagraph?: string;
  // Paragraphe éditorial par région (facultatif), clé = slug de région
  regionIntro?: Record<string, string>;
  guide: ThemeGuide | ToProvide;
  faq: ThemeFaqItem[] | ToProvide;
  // « Votre chalet est au bord de l'eau ? Ajoutez-le gratuitement »
  titleOwner: string;
}

export function isThemeContentReady(t: ThemeContent): boolean {
  return t.active && t.guide !== TO_PROVIDE && t.faq !== TO_PROVIDE;
}
