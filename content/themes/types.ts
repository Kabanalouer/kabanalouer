// Contenu éditorial d'une page thème (gabarit ThemeLandingPage). Un fichier par thème dans content/themes/.
// Variables remplacées au rendu (voir lib/themeStats.ts et ThemeLandingPage.tsx). Partout : {lieu}, {prixMin}.
// National : {prixP10}, {prixP90}, {nLaurentides}, {nLanaudiere}, {nQuebec}, {villesMontreal}, {villesQuebec}, {nChiens},
// {lienChiens}. Région et ville : {fourchette}, {accesPhrase}, {lienChiens}, {chaletsChiens}, {accepte}, {ailleursChiens},
// {capacite}, {grands}. Région : {deRegion}, {villesTop}. Ville : {ville}, {voisines}, {lienRegion}, {deRegion}, {nRegion}.

import type { RegionContent } from "../regions/types";

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
  // Réponse quand le nombre de chalets concernés est nul (question « chiens »)
  aNone?: string;
  // Variables qui doivent avoir une valeur pour que la question soit posée (jamais de « — » dans une réponse)
  needs?: string[];
}

// Une FAQ différente par niveau : le même texte sur toutes les pages région et ville serait du contenu dupliqué.
export interface ThemeFaq {
  national: ThemeFaqItem[];
  region: ThemeFaqItem[];
  city: ThemeFaqItem[];
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
  // Balises : si présent, `titleBase` remplace le titre calculé (« Chalet à louer avec spa » + lieu + nombre de chalets)
  // et `description` est un modèle ({N}, {lieu}, {prix}, {ouvertAnnee}). Sans `meta`, titre et description par défaut.
  meta?: { titleBase: string; description: string };
  // Bloc éditorial des pages région : titre (« Le bord de l'eau » + lieu) et champ du texte dans content/regions/{région}.ts.
  // Texte vide = bloc non affiché.
  regionBlockTitle?: string;
  regionIntroKey?: keyof Omit<RegionContent, "slug" | "name" | "preposition">;
  // Guide : page nationale seulement
  guide: ThemeGuide | ToProvide;
  faq: ThemeFaq | ToProvide;
  // « Votre chalet est au bord de l'eau ? Ajoutez-le gratuitement »
  titleOwner: string;
}

export function isThemeContentReady(t: ThemeContent): boolean {
  return t.active && t.guide !== TO_PROVIDE && t.faq !== TO_PROVIDE;
}
