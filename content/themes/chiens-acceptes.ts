import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-28). Apostrophes droites : fr() (lib/frTypography.ts) applique l'apostrophe ’ et les
// espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "chiens-acceptes",
  label: "qui accepte les chiens",
  labelPlural: "chalets qui acceptent les chiens",
  breadcrumbLabel: "Chiens acceptés",
  h1Base: "Location de chalet qui accepte les chiens",
  active: true,
  meta: {
    titleBaseNational: "Location de chalet qui accepte les chiens",
    titleBase: "Chalet à louer qui accepte les chiens",
    description: "{N} chalets qui acceptent les chiens {lieu}{prix}.{chiensInfos} Écrivez directement au propriétaire.",
  },
  topRegionsWord: "la plupart",
  nationalRegionParagraph:
    "{topRegionsParagraph} Lanaudière et les Laurentides sont à environ une heure de Montréal. Dans la région de Québec, la plupart se trouvent dans la vallée de la rivière Sainte-Anne et la vallée Bras-du-Nord, à moins d'une heure de la ville.{autresRegions}",
  regionBlockTitle: "Les chalets qui acceptent les chiens",
  regionIntroKey: "dogsIntro",
  guide: {
    title: "Partir au chalet avec son chien",
    intro: "",
    blocks: [
      {
        h3: "Lisez les 3 conditions",
        p: "Chaque fiche indique le nombre maximum de chiens, la limite de poids et les frais. Vérifiez les trois avant d'écrire au propriétaire : c'est là que la plupart des demandes bloquent.",
      },
      {
        h3: "Les frais : par nuit ou par séjour",
        p: "Certains chalets accueillent les chiens gratuitement. Les autres demandent des frais par nuit ou un montant fixe par séjour. Pour une semaine, un montant par séjour revient souvent moins cher. Faites le calcul selon la durée de votre séjour.",
      },
      {
        h3: "Gros chiens",
        p: "Plusieurs chalets limitent le poids à 25 ou 50 lb. Si votre chien est plus lourd, choisissez la pastille « Gros chiens acceptés » ou précisez son poids dès votre premier message.",
      },
      {
        h3: "Présentez votre chien",
        p: "Donnez sa race, son poids et son âge, et dites s'il est habitué à rester seul. Un propriétaire rassuré répond plus vite, et vous évitez les surprises à l'arrivée.",
      },
      {
        h3: "Lac, forêt et voisins",
        p: "Un chalet au bord de l'eau plaît aux chiens nageurs, mais demandez si la rive est privée. En forêt, gardez votre chien en laisse près des chemins et pendant la saison de la chasse, à l'automne. Les terrains ne sont pas toujours clôturés : demandez-le si votre chien a tendance à fuguer.",
      },
      {
        h3: "Son bagage",
        p: "Ses bols, sa nourriture, sa laisse, des sacs, une serviette pour le retour de promenade et une couverture pour les meubles. Laisser le chalet propre, c'est ce qui permet aux propriétaires de continuer d'accepter les chiens.",
      },
    ],
  },
  faq: {
    // Page nationale : questions générales
    national: [
      {
        q: "Combien de chalets acceptent les chiens au Québec ?",
        a: "Kabanalouer compte {N} chalets qui acceptent les chiens, dans {nRegions} régions. {topRegions} en comptent le plus. Que vous cherchiez un chalet « chiens acceptés » ou « animaux acceptés », chaque fiche précise le nombre de chiens, le poids et les frais.",
      },
      {
        q: "Y a-t-il des frais pour un chien dans un chalet ?",
        a: "Ça dépend du chalet.{fraisInfo} Le montant est indiqué sur chaque fiche.",
        needs: ["fraisInfo"],
      },
      {
        q: "Les gros chiens sont-ils acceptés ?",
        a: "Oui, dans {nToutesTailles} chalets.{limitesPoids} La limite est indiquée sur chaque fiche.",
        needs: ["nToutesTailles"],
      },
      {
        q: "Combien de chiens puis-je amener ?",
        a: "Chaque propriétaire fixe un maximum, jusqu'à {maxChiens} chiens. {nDeuxChiensPlus} chalets en acceptent au moins 2.",
        needs: ["maxChiens", "nDeuxChiensPlus"],
      },
      {
        q: "Où louer un chalet qui accepte les chiens près de Montréal ?",
        a: "Lanaudière ({nLanaudiere}) et les Laurentides ({nLaurentides}) sont à environ une heure de Montréal. {villesMontreal} sont parmi les plus représentées.",
        needs: ["villesMontreal"],
      },
      {
        q: "Où louer un chalet qui accepte les chiens près de Québec ?",
        a: "La région de Québec compte {nQuebec} chalets qui acceptent les chiens, surtout à {villesQuebec}, à moins d'une heure de la ville.",
        needs: ["villesQuebec"],
      },
      {
        q: "Y a-t-il des frais de service ?",
        a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
      },
    ],
    // Pages région : 5 questions, toutes calculées sur les chalets de la région
    region: [
      {
        q: "Combien coûte un chalet qui accepte les chiens {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Dans quelles villes {deRegion} trouver un chalet qui accepte les chiens ?",
        a: "{villesTop} regroupent le plus de chalets qui acceptent les chiens de la région sur Kabanalouer.",
        needs: ["villesTop"],
      },
      {
        q: "Combien de chalets {lieu} acceptent les chiens sans frais ?",
        a: "{gratuitRegion}",
        needs: ["gratuitRegion"],
      },
      {
        q: "Les gros chiens sont-ils acceptés {lieu} ?",
        a: "{grosRegion}",
        needs: ["grosRegion"],
      },
      {
        q: "Y a-t-il des chalets qui acceptent les chiens au bord de l'eau ou avec spa {lieu} ?",
        a: "{croises}",
        needs: ["croises"],
      },
    ],
    // Pages ville : 3 questions, toutes calculées sur les chalets de la ville
    city: [
      {
        q: "Combien coûte un chalet qui accepte les chiens {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Quelles conditions pour les chiens {lieu} ?",
        a: "{conditionsVille}",
        needs: ["conditionsVille"],
      },
      {
        q: "Où trouver d'autres chalets qui acceptent les chiens près {deVille} ?",
        a: "{voisines}[l'ensemble {deRegion}]({lienRegion}) ({nRegion}).",
      },
    ],
  },
  titleOwner: "Vous acceptez les chiens ? Ajoutez votre chalet gratuitement",
};

export default content;
