import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-29). Apostrophes droites : fr() (lib/frTypography.ts) applique l'apostrophe ’ et les
// espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "table-de-billard",
  label: "avec table de billard",
  labelPlural: "chalets avec table de billard",
  breadcrumbLabel: "Table de billard",
  h1Base: "Location de chalet avec table de billard",
  active: true,
  meta: {
    titleBase: "Chalet à louer avec billard",
    titleBaseNational: "Chalet à louer avec table de billard",
    description: "{N} chalets avec table de billard à louer {lieu}{prix}.{billardInfos} Écrivez directement au propriétaire.",
  },
  nationalRegionParagraph: "{choixExploitants}{domaineConcentre}",
  regionBlockTitle: "Les chalets avec table de billard",
  regionIntroKey: "billiardIntro",
  guide: {
    title: "Bien choisir un chalet pour groupe avec billard",
    intro: "",
    blocks: [
      {
        h3: "Comptez les lits, pas seulement les voyageurs",
        p: "La capacité annoncée inclut parfois des divans-lits ou des mezzanines. Pour un groupe d'adultes, regardez le nombre de chambres et de salles de bain sur la fiche, ou demandez la répartition des lits au propriétaire.",
      },
      {
        h3: "Où est la table ?",
        p: "Une table au sous-sol ou dans une salle de jeux permet de jouer tard sans réveiller ceux qui dorment. Dans l'aire ouverte, l'ambiance est plus conviviale, mais le bruit s'entend partout. Demandez-le au propriétaire si c'est important pour votre groupe.",
      },
      {
        h3: "Vérifiez l'équipement",
        p: "Demandez si les queues, les boules, le triangle et la craie sont fournis, et en quel état. Une table de taille standard (7 à 9 pi) demande assez d'espace autour pour jouer confortablement.",
      },
      {
        h3: "Les règles du chalet",
        p: "Plusieurs propriétaires limitent le nombre de personnes sur place, les heures de bruit ou les fêtes. Lisez les règles sur la fiche et parlez clairement de votre groupe dans votre premier message : c'est le meilleur moyen d'éviter un refus ou un dépôt retenu.",
      },
      {
        h3: "Billard + spa ou + lac",
        p: "Pour une fin de semaine complète, cherchez un chalet qui combine le billard avec un spa ou l'accès à un lac : il y a de quoi occuper tout le monde, beau temps, mauvais temps.",
      },
      {
        h3: "Réservez tôt",
        p: "Les grands chalets sont rares et partent vite pour les fins de semaine, le temps des Fêtes et les réunions de famille d'été. Réservez de 3 à 6 mois d'avance pour ces dates.",
      },
    ],
  },
  faq: {
    // Page nationale : questions générales
    national: [
      {
        q: "Combien coûte un chalet avec table de billard au Québec ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit. La plupart se situent entre {prixP10} $ et {prixP90} $, selon la taille du chalet.{parPersonne}",
        needs: ["prixMin"],
      },
      {
        q: "Où louer un chalet avec billard près de Montréal ?",
        a: "Les Laurentides ({nLaurentides}) et Lanaudière ({nLanaudiere}), à environ une heure de Montréal, regroupent le plus de choix{autourDe}.",
      },
      {
        q: "Où louer un chalet avec billard près de Québec ?",
        a: "{quebecPhrase}",
        needs: ["quebecPhrase"],
      },
      {
        q: "Y a-t-il des chalets avec billard pour un grand groupe ?",
        a: "{groupesPhrase}",
        needs: ["groupesPhrase"],
      },
      {
        q: "Y a-t-il des chalets avec billard et spa ?",
        a: "Oui, {nBillardSpa} chalets ont les deux{billardEauPhrase}.",
        needs: ["nBillardSpa"],
      },
      {
        q: "La table de billard est-elle privée ?",
        a: "{prive}",
        needs: ["prive"],
      },
      {
        q: "Y a-t-il des frais de service ?",
        a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
      },
    ],
    // Pages région : 4 questions, toutes calculées sur les chalets de la région
    region: [
      {
        q: "Combien coûte un chalet avec billard {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Dans quelles villes {deRegion} trouver un chalet avec billard ?",
        a: "{villesTop} regroupent le plus de chalets avec billard de la région sur Kabanalouer.",
        needs: ["villesTop"],
      },
      {
        q: "Combien de chalets avec billard {lieu} accueillent 10 ou 16 personnes ?",
        a: "{groupes1016}",
        needs: ["groupes1016"],
      },
      {
        q: "Y a-t-il des chalets avec billard {lieu} avec spa ou au bord de l'eau ?",
        a: "{billardSpaEau}",
        needs: ["billardSpaEau"],
      },
    ],
    // Pages ville : 3 questions, toutes calculées sur les chalets de la ville
    city: [
      {
        q: "Combien coûte un chalet avec billard {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Combien de personnes les chalets avec billard {lieu} peuvent-ils accueillir ?",
        a: "{groupes1016}",
        needs: ["groupes1016"],
      },
      {
        q: "Où trouver d'autres chalets avec billard près {deVille} ?",
        a: "{voisines}[l'ensemble {deRegion}]({lienRegion}) ({nRegion}).",
      },
    ],
  },
  titleOwner: "Votre chalet a une table de billard ? Ajoutez-le gratuitement",
};

export default content;
