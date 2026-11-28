import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-29). Apostrophes droites : fr() (lib/frTypography.ts) applique l'apostrophe ’ et les
// espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "borne-de-recharge",
  label: "avec borne de recharge",
  labelPlural: "chalets avec borne de recharge",
  breadcrumbLabel: "Borne de recharge",
  h1Base: "Location de chalet avec borne de recharge",
  active: true,
  meta: {
    titleBase: "Chalet avec borne de recharge",
    titleBaseNational: "Chalet à louer avec borne de recharge",
    description:
      "{N} chalets avec borne de recharge pour véhicule électrique {lieu}{prix}.{evInfos} Rechargez au chalet pendant votre séjour. Écrivez directement au propriétaire, sans frais de service.",
  },
  nationalRegionParagraph: "{evChoix}{evLoin}",
  regionBlockTitle: "Les chalets avec borne de recharge",
  regionIntroKey: "chargerIntro",
  guide: {
    title: "Partir au chalet en véhicule électrique",
    intro: "",
    blocks: [
      {
        h3: "Niveau 1, niveau 2 ou recharge rapide",
        p: "Une prise ordinaire de 120 V (niveau 1) ajoute seulement quelques kilomètres d'autonomie par heure. Une borne de niveau 2 (240 V) en ajoute en général de 30 à 50 par heure : en une nuit, la plupart des véhicules repartent pleins. La recharge rapide (niveau 3) est très rare dans un chalet.",
      },
      {
        h3: "Le connecteur",
        p: "Au Québec, la plupart des bornes de niveau 2 utilisent la prise J1772. Plusieurs véhicules Tesla et récents utilisent une autre prise et se branchent sur une borne J1772 avec un adaptateur. Vérifiez que vous l'avez dans le coffre.",
      },
      {
        h3: "Incluse ou payante ?",
        p: "Certains propriétaires incluent la recharge dans le prix, d'autres demandent un montant par nuit, par séjour ou au kWh. Le détail est sur la fiche quand le propriétaire l'a précisé. Sinon, demandez-le dans votre premier message.",
      },
      {
        h3: "Réservée au chalet ?",
        p: "Dans un domaine de plusieurs chalets, la borne peut être réservée à votre chalet ou partagée. Si elle est partagée, demandez s'il faut s'inscrire à un horaire.",
      },
      {
        h3: "L'hiver, prévoyez plus large",
        p: "Le froid réduit l'autonomie, souvent de 20 à 30 %, et parfois davantage par grand froid. Préchauffez l'habitacle pendant que le véhicule est branché, et ne comptez pas sur une recharge complète si vous arrivez tard et repartez tôt.",
      },
      {
        h3: "Planifiez le trajet",
        p: "Pour les régions éloignées (Gaspésie, Côte-Nord, Abitibi), repérez une ou deux bornes rapides sur votre route avec l'application de votre réseau de recharge. La borne au chalet s'occupe du reste.",
      },
    ],
  },
  faq: {
    // Page nationale : questions générales
    national: [
      {
        q: "Combien de chalets avec borne de recharge y a-t-il au Québec ?",
        a: "Kabanalouer en compte {N}, dans {nRegions} régions{evTopRegions}.",
      },
      {
        q: "Combien coûte un chalet avec borne de recharge ?",
        a: "Les prix de départ commencent à {prixMin} $ la nuit. La plupart se situent entre {prixP10} $ et {prixP90} $. La recharge est parfois incluse et parfois facturée : c'est indiqué sur la fiche.",
        needs: ["prixMin"],
      },
      {
        q: "Quel type de borne vais-je trouver ?",
        a: "Le plus souvent une borne de niveau 2 avec prise J1772, qui recharge la plupart des véhicules en une nuit.{evNiveau2Phrase} Le détail est sur chaque fiche quand le propriétaire l'a précisé.",
      },
      {
        q: "Ma Tesla peut-elle se recharger au chalet ?",
        a: "Oui, sur une borne J1772, avec l'adaptateur Tesla.{evTeslaPhrase}",
      },
      {
        q: "Y a-t-il des chalets avec borne en région éloignée ?",
        a: "{evEloigneesPhrase}",
        needs: ["evEloigneesPhrase"],
      },
      {
        q: "Y a-t-il des frais de service ?",
        a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
      },
    ],
    // Pages région : 4 questions, toutes calculées sur les chalets de la région
    region: [
      {
        q: "Combien coûte un chalet avec borne de recharge {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Dans quelles villes {deRegion} trouver un chalet avec borne de recharge ?",
        a: "{villesTop} regroupent le plus de chalets avec borne de recharge de la région sur Kabanalouer.",
        needs: ["villesTop"],
      },
      {
        q: "Quel type de borne trouve-t-on {lieu} ?",
        a: "{evTypeRegion}",
        needs: ["evTypeRegion"],
      },
      {
        q: "Y a-t-il des chalets avec borne de recharge {lieu} avec spa, au bord de l'eau ou qui acceptent les chiens ?",
        a: "{evCombos}",
        needs: ["evCombos"],
      },
    ],
    // Pages ville : 3 questions, toutes calculées sur les chalets de la ville
    city: [
      {
        q: "Combien coûte un chalet avec borne de recharge {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Les chalets avec borne de recharge {lieu} ont-ils aussi un spa ou acceptent-ils les chiens ?",
        a: "{evCombos}",
        needs: ["evCombos"],
      },
      {
        q: "Où trouver d'autres chalets avec borne de recharge près {deVille} ?",
        a: "{voisines}[l'ensemble {deRegion}]({lienRegion}) ({nRegion}).",
      },
    ],
  },
  titleOwner: "Votre chalet a une borne de recharge ? Ajoutez-le gratuitement",
};

export default content;
