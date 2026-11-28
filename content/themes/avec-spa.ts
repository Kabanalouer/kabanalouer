import type { ThemeContent } from "./types";

// Textes fournis par Simon (2026-11-28). Apostrophes droites : fr() (lib/frTypography.ts) applique l'apostrophe ’ et les
// espaces insécables au rendu. Les liens se notent [texte](adresse).
const content: ThemeContent = {
  slug: "avec-spa",
  label: "avec spa",
  labelPlural: "chalets avec spa",
  breadcrumbLabel: "Avec spa",
  h1Base: "Location de chalet avec spa",
  active: true,
  meta: {
    titleBase: "Chalet à louer avec spa",
    description: "{N} chalets avec spa privé à louer {lieu}{prix}.{ouvertAnnee} Écrivez directement au propriétaire, sans frais de service.",
  },
  nationalRegionParagraph:
    "{topRegionsParagraph} Les Laurentides et Lanaudière sont à environ une heure de Montréal. Dans la région de Québec, la plupart se trouvent dans la vallée de la rivière Sainte-Anne, à environ une heure de la ville.{autresRegions}",
  regionBlockTitle: "Les chalets avec spa",
  regionIntroKey: "spaIntro",
  guide: {
    title: "Bien choisir son chalet avec spa",
    intro: "",
    blocks: [
      {
        h3: "Spa privé ou partagé ?",
        p: "Un spa privé est réservé à votre groupe pendant tout le séjour. Un spa partagé est utilisé avec d'autres chalets du même domaine, souvent selon un horaire. Le badge sur chaque fiche l'indique quand le propriétaire l'a précisé.",
      },
      {
        h3: "Ouvert l'hiver ?",
        p: "Le spa sous la neige, c'est souvent la raison du voyage. Pourtant, certains spas ferment pendant la saison froide. Si vous partez de novembre à avril, choisissez un chalet marqué « à l'année » ou confirmez-le avec le propriétaire.",
      },
      {
        h3: "Assez de places pour tout le monde",
        p: "Un spa compte en général de 4 à 8 places. Pour un groupe de 12, tout le monde ne pourra pas s'y baigner en même temps. Comparez le nombre de places du spa au nombre de voyageurs sur la fiche.",
      },
      {
        h3: "Pour une escapade à deux",
        p: "Cherchez un chalet de 2 à 4 voyageurs avec un spa privé : vous aurez le spa pour vous seuls, sans voisins. Le filtre « Pour 2 à 4 personnes » les regroupe.",
      },
      {
        h3: "Spa, sauna et eau froide",
        p: "Plusieurs chalets ajoutent un sauna, et parfois un lac où se rafraîchir. Ça permet de faire le cycle chaud-froid-repos, comme dans un spa nordique, sans quitter le chalet. Le filtre « Spa + sauna » les regroupe.",
      },
      {
        h3: "Quand réserver",
        p: "Les fins de semaine d'hiver, la période des Fêtes et la semaine de relâche partent en premier. Réservez de 2 à 4 mois d'avance pour ces dates. En semaine et au printemps, le choix est plus grand et les prix souvent plus bas.",
      },
    ],
  },
  faq: {
    // Page nationale : questions générales
    national: [
      {
        q: "Combien coûte un chalet avec spa au Québec ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit. La plupart se situent entre {prixP10} $ et {prixP90} $, selon la taille du chalet, la région et la saison. Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Où trouver un chalet avec spa près de Montréal ?",
        a: "Les Laurentides ({nLaurentides} chalets) et Lanaudière ({nLanaudiere}) sont à environ une heure de Montréal et regroupent la majorité des chalets avec spa. {villesMontreal} sont parmi les plus populaires.",
        needs: ["villesMontreal"],
      },
      {
        q: "Où trouver un chalet avec spa près de Québec ?",
        a: "La région de Québec compte {nQuebec} chalets avec spa, surtout à {villesQuebec}. Charlevoix ({nCharlevoix}) offre aussi des spas avec vue sur le fleuve.",
        needs: ["villesQuebec", "nCharlevoix"],
      },
      {
        q: "Le spa est-il privé ?",
        a: "Dans {nPrive} chalets sur {N}, oui. Le spa est alors réservé à votre groupe. Quand il est partagé, la fiche l'indique.",
        needs: ["nPrive"],
      },
      {
        q: "Le spa est-il ouvert l'hiver ?",
        a: "Au moins {nAnnee} chalets ont un spa ouvert à l'année. Pour les autres, confirmez avec le propriétaire avant de réserver un séjour entre novembre et avril.",
        needs: ["nAnnee"],
      },
      {
        q: "Y a-t-il des chalets avec spa pour deux personnes ?",
        a: "Oui, {nDeux} chalets avec spa accueillent de 2 à 4 voyageurs, pratiques pour une escapade en amoureux.",
        needs: ["nDeux"],
      },
      {
        q: "Y a-t-il des frais de service ?",
        a: "Non. Vous contactez directement le propriétaire, sans frais de service ni commission.",
      },
    ],
    // Pages région : 5 questions, toutes calculées sur les chalets de la région
    region: [
      {
        q: "Combien coûte un chalet avec spa {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Dans quelles villes {deRegion} trouver un chalet avec spa ?",
        a: "{villesTop} regroupent le plus de chalets avec spa de la région sur Kabanalouer.",
        needs: ["villesTop"],
      },
      {
        q: "Combien de chalets avec spa {lieu} sont ouverts l'hiver ?",
        a: "Au moins {nAnnee} ont un spa ouvert à l'année.",
        needs: ["nAnnee"],
      },
      {
        q: "Y a-t-il des chalets avec spa {lieu} pour deux ou pour un grand groupe ?",
        a: "{deuxGroupes}",
        needs: ["deuxGroupes"],
      },
      {
        q: "Y a-t-il des chalets avec spa {lieu} qui acceptent les chiens ?",
        a: "Oui, {chaletsChiens} {lieu} {accepte} les chiens. {lienChiens}",
        aNone: "Pas pour l'instant {lieu}.{ailleursChiens}",
      },
    ],
    // Pages ville : 3 questions, toutes calculées sur les chalets de la ville
    city: [
      {
        q: "Combien coûte un chalet avec spa {lieu} ?",
        a: "Sur Kabanalouer, les prix de départ commencent à {prixMin} $ la nuit {lieu}.{fourchette} Le propriétaire confirme le prix final pour vos dates.",
        needs: ["prixMin"],
      },
      {
        q: "Combien de places ont les spas des chalets {lieu}, et sont-ils ouverts l'hiver ?",
        a: "{spaDetail}",
        needs: ["spaDetail"],
      },
      {
        q: "Où trouver d'autres chalets avec spa près {deVille} ?",
        a: "{voisines}[l'ensemble {deRegion}]({lienRegion}) ({nRegion}).",
      },
    ],
  },
  titleOwner: "Votre chalet a un spa ? Ajoutez-le gratuitement",
};

export default content;
