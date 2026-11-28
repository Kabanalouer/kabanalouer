import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-28). Apostrophes droites : fr() (lib/frTypography.ts) applique l'apostrophe ’ et les
// espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "avec-sauna",
  label: "avec sauna",
  labelPlural: "chalets avec sauna",
  breadcrumbLabel: "Avec sauna",
  h1Base: "Location de chalet avec sauna",
  active: true,
  meta: {
    titleBaseNational: "Location de chalet avec sauna",
    titleBase: "Chalet à louer avec sauna",
    description: "{N} chalets avec sauna{saunaPrive} à louer {lieu}{prix}.{saunaInfos} Écrivez directement au propriétaire, sans frais de service.",
  },
  topRegionsWord: "la grande majorité",
  nationalRegionParagraph:
    "{topRegionsParagraph}{concentration}",
  regionBlockTitle: "Les chalets avec sauna",
  regionIntroKey: "saunaIntro",
  guide: {
    title: "Bien profiter d'un chalet avec sauna",
    intro: "",
    blocks: [
      {
        h3: "Le cycle chaud, froid, repos",
        p: "10 à 15 minutes dans le sauna, puis un passage au froid (lac, neige, douche ou bain d'eau froide), puis 10 à 15 minutes de repos dans un spa, hamac ou chaise confortable. On répète 2 ou 3 fois. Au chalet, vous le faites à votre rythme, sans horaire.",
      },
      {
        h3: "Sauna + spa, ou sauna + lac ?",
        p: "Le spa sert à la détente entre deux séances. Le lac ou la neige donnent le vrai contraste froid. Les chalets qui ont les deux offrent le circuit complet : cherchez la pastille « Circuit complet ».",
      },
      {
        h3: "Le temps de chauffe",
        p: "Un sauna à bois ou électrique prend environ 30 minutes à chauffer. Allumez-le en avance, et demandez au propriétaire comment il fonctionne à votre arrivée.",
      },
      {
        h3: "Combien de places",
        p: "La plupart des saunas de chalet accueillent de 2 à 6 personnes. En grand groupe, prévoyez des séances à tour de rôle, ou demandez la capacité au propriétaire.",
      },
      {
        h3: "Sécurité",
        p: "Buvez de l'eau avant et après chaque séance, évitez l'alcool pendant le cycle et ne laissez pas les enfants seuls dans le sauna. Les personnes enceintes ou avec un problème cardiaque devraient demander l'avis d'un médecin.",
      },
      {
        h3: "Quand y aller",
        p: "Le sauna est à son meilleur de novembre à mars, après une journée de ski, de raquette ou de motoneige. Ces fins de semaine partent vite : réservez de 2 à 3 mois d'avance. En été, le sauna suivi d'une baignade dans le lac est tout aussi agréable, et le choix est plus grand.",
      },
    ],
  },
  faq: {
    // Page nationale : questions générales
    national: [
      {
        q: "Combien coûte un chalet avec sauna au Québec ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit. La plupart se situent entre {prixP10} $ et {prixP90} $, selon la taille du chalet et la saison. Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Où louer un chalet avec sauna près de Montréal ?",
        a: "Les Laurentides ({nLaurentides}) et Lanaudière ({nLanaudiere}), à environ une heure de Montréal, regroupent la grande majorité des chalets avec sauna.{villesMontrealPhrase}",
      },
      {
        q: "Où louer un chalet avec sauna près de Québec ?",
        a: "{quebecPhrase}",
        needs: ["quebecPhrase"],
      },
      {
        q: "Y a-t-il des chalets avec sauna et spa ?",
        a: "Oui, {nSaunaSpa} chalets ont les deux{circuitPhrase}.",
        needs: ["nSaunaSpa"],
      },
      {
        q: "Le sauna est-il privé ?",
        a: "{prive} Quand il est partagé, la fiche l'indique.",
        needs: ["prive"],
      },
      {
        q: "Y a-t-il des chalets avec sauna pour deux ?",
        a: "Oui, {nDeux} chalets avec sauna accueillent de 2 à 4 voyageurs, dont des cabanes dans les arbres et des micro-chalets.",
        needs: ["nDeux"],
      },
      {
        q: "Y a-t-il des frais de service ?",
        a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
      },
    ],
    // Pages région : 4 questions, toutes calculées sur les chalets de la région
    region: [
      {
        q: "Combien coûte un chalet avec sauna {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Dans quelles villes {deRegion} trouver un chalet avec sauna ?",
        a: "{villesTop} regroupent le plus de chalets avec sauna de la région sur Kabanalouer.",
        needs: ["villesTop"],
      },
      {
        q: "Combien de chalets avec sauna {lieu} ont aussi un spa ou sont au bord de l'eau ?",
        a: "{saunaSpaEau}",
        needs: ["saunaSpaEau"],
      },
      {
        q: "Y a-t-il des chalets avec sauna {lieu} pour deux ou pour un grand groupe ?",
        a: "{deuxGroupes}",
        needs: ["deuxGroupes"],
      },
    ],
    // Pages ville : 3 questions, toutes calculées sur les chalets de la ville
    city: [
      {
        q: "Combien coûte un chalet avec sauna {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Les chalets avec sauna {lieu} ont-ils aussi un spa ou sont-ils au bord de l'eau ?",
        a: "{saunaSpaEau}",
        needs: ["saunaSpaEau"],
      },
      {
        q: "Où trouver d'autres chalets avec sauna près {deVille} ?",
        a: "{voisines}[l'ensemble {deRegion}]({lienRegion}) ({nRegion}).",
      },
    ],
  },
  titleOwner: "Votre chalet a un sauna ? Ajoutez-le gratuitement",
};

export default content;
