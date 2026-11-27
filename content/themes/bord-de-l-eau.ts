import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-27). Écrits avec des apostrophes droites : fr() (lib/frTypography.ts) applique
// l'apostrophe ’ et les espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "bord-de-l-eau",
  label: "au bord de l'eau",
  labelPlural: "chalets au bord de l'eau",
  breadcrumbLabel: "Au bord de l'eau",
  h1Base: "Location de chalet au bord de l'eau",
  active: true,
  nationalRegionParagraph:
    "{topRegionsParagraph} Les Laurentides et Lanaudière sont à environ une heure de Montréal. La région de Québec offre aussi des chalets face au fleuve, à l'île d'Orléans.",
  regionIntro: {},
  guide: {
    title: "Bien choisir son chalet au bord de l'eau",
    intro: "",
    blocks: [
      {
        h3: "Bord de l'eau ou accès au lac ?",
        p: "Un chalet au bord de l'eau est directement sur la rive, souvent avec un quai ou une plage. Un accès au lac peut être à quelques pas ou au bout d'un sentier, parfois partagé. Le badge sur chaque fiche précise lequel des deux, et si l'accès est privé ou public.",
      },
      {
        h3: "Lac, rivière ou fleuve ?",
        p: "Le lac est le plus calme pour la baignade et le kayak. La rivière offre du courant et des paysages en mouvement, mieux pour la pêche que pour la baignade des petits. Le fleuve et la mer offrent la vue et les couchers de soleil, la baignade y est plus froide.",
      },
      {
        h3: "Quoi faire au bord de l'eau",
        p: "L'été : baignade, kayak, canot, planche à pagaie et pêche. L'hiver : patin sur le lac gelé, pêche blanche et raquette. Vérifiez sur la fiche si le propriétaire prête des embarcations.",
      },
      {
        h3: "Avec de jeunes enfants",
        p: "Demandez au propriétaire la distance entre le chalet et l'eau, la pente du terrain et s'il y a une plage de sable ou un quai. Apportez des vestes de flottaison à la bonne taille : elles ne sont pas toujours fournies.",
      },
      {
        h3: "Lacs sans bateaux à moteur",
        p: "Pour le calme, cherchez un lac où les moteurs à essence sont interdits ou limités. Demandez-le au propriétaire : la règle change d'un lac à l'autre.",
      },
      {
        h3: "Quand réserver",
        p: "Les chalets au bord de l'eau partent en premier : réservez de 3 à 6 mois d'avance pour juillet et août. Juin et septembre offrent plus de choix, de l'eau encore bonne et souvent de meilleurs prix.",
      },
    ],
  },
  faq: [
    {
      q: "Combien coûte un chalet au bord de l'eau {lieu} ?",
      a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit. La plupart se situent entre {prixP10} $ et {prixP90} $, selon la taille du chalet et la saison. Le propriétaire confirme le prix final pour vos dates.",
    },
    {
      q: "Où trouver un chalet au bord de l'eau près de Montréal ?",
      scope: "national",
      a: "Les Laurentides ({nLaurentides} chalets) et Lanaudière ({nLanaudiere}) sont à environ une heure de Montréal et regroupent la majorité des chalets au bord d'un lac. {villesMontreal} sont parmi les plus accessibles.",
    },
    {
      q: "Où trouver un chalet au bord de l'eau près de Québec ?",
      scope: "national",
      a: "La région de Québec compte {nQuebec} chalets au bord de l'eau, dont plusieurs à {villesQuebec}. Charlevoix offre aussi des vues sur le fleuve.",
    },
    {
      q: "Dans quelles villes {lieu} trouver un chalet au bord de l'eau ?",
      scope: "local",
      a: "{topVilles}.",
    },
    {
      q: "Quelle est la différence entre bord de l'eau et accès au lac ?",
      a: "Bord de l'eau : le chalet est sur la rive. Accès au lac : l'eau est accessible à pied, parfois par un sentier ou une plage partagée. Chaque fiche l'indique.",
    },
    {
      q: "Y a-t-il des chalets au bord de l'eau qui acceptent les chiens {lieu} ?",
      a: "Oui, {nChiens} chalets au bord de l'eau {lieu} acceptent les chiens. {lienChiens}",
      aNone: "Pas pour l'instant. Consultez les {lienChiens}.",
    },
    {
      q: "Peut-on se baigner devant tous les chalets ?",
      a: "Pas toujours. Certaines rives sont rocheuses ou marécageuses, et la baignade est déconseillée dans le fleuve et les rivières à fort courant. Demandez au propriétaire s'il y a une plage ou un quai.",
    },
    {
      q: "Y a-t-il des frais de service ?",
      a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
    },
  ],
  titleOwner: "Votre chalet est au bord de l'eau ? Ajoutez-le gratuitement",
};

export default content;
