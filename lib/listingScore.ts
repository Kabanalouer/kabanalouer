export type ScoreInput = {
  photoCount: number;
  title: string;
  description: string;
  amenities: string[];
  nearbyActivities: string[];
  citqNumber: string;
  icalUrl: string | null;
  hasFutureBlocked: boolean;
  roomsAllHavePhotos: boolean;
  bioFilled: boolean;
  avatarFilled: boolean;
  reviewCount: number;
  recentReviewCount: number;
};

export type Criterion = {
  key: string;
  label: string;
  points: number;
  achieved: boolean;
  section?: string;
  profileLink?: boolean;
  priority?: boolean;
};

export function buildCriteria(input: ScoreInput): Criterion[] {
  const hasAvailability = !!(input.icalUrl?.trim()) || input.hasFutureBlocked;
  return [
    { key: "photos5",    label: "5 photos minimum",                                   points: 10, achieved: input.photoCount >= 5,                section: "photos" },
    { key: "photos25",   label: "25 photos et plus",                                   points: 5,  achieved: input.photoCount >= 25,               section: "photos" },
    { key: "roomPhotos", label: "Toutes les chambres et salons ont au moins 1 photo",  points: 10, achieved: input.roomsAllHavePhotos,              section: "chambres" },
    { key: "bio",        label: "Bio du propriétaire remplie",                         points: 5,  achieved: input.bioFilled,                      profileLink: true, priority: !input.bioFilled },
    { key: "avatar",     label: "Photo de profil remplie",                             points: 10, achieved: input.avatarFilled,                   profileLink: true, priority: !input.avatarFilled },
    { key: "title40",    label: "Titre de 40 caractères et plus",                      points: 5,  achieved: input.title.length >= 40,             section: "titre" },
    { key: "desc500",    label: "Description de 500 caractères et plus",               points: 10, achieved: input.description.length >= 500,      section: "description" },
    { key: "desc1500",   label: "Description de 1500 caractères et plus",              points: 5,  achieved: input.description.length >= 1500,     section: "description" },
    { key: "amenities",  label: "10 caractéristiques sélectionnées et plus",           points: 10, achieved: input.amenities.length >= 10,         section: "equipements" },
    { key: "nearby",     label: "Activités à proximité renseignées",                   points: 5,  achieved: input.nearbyActivities.length > 0,    section: "proximite" },
    { key: "avail",      label: "iCal synchronisé ou disponibilités saisies",          points: 10, achieved: hasAvailability,                      section: "calendrier" },
    { key: "citq",       label: "Numéro CITQ renseigné (6 chiffres)",                  points: 5,  achieved: input.citqNumber.length === 6,        section: "infos" },
    { key: "review1",    label: "Au moins 1 avis reçu",                                points: 5,  achieved: input.reviewCount >= 1 },
    { key: "review6mo",  label: "Au moins 1 avis dans les 6 derniers mois",            points: 5,  achieved: input.recentReviewCount >= 1 },
  ];
}

export function computeScore(input: ScoreInput): number {
  return buildCriteria(input).reduce((sum, c) => sum + (c.achieved ? c.points : 0), 0);
}

export function getScoreLevel(score: number): { color: string; label: string } {
  if (score <= 30) return { color: "#ef4444", label: "Annonce incomplète" };
  if (score <= 50) return { color: "#f97316", label: "Annonce à améliorer" };
  if (score <= 70) return { color: "#f59e0b", label: "Bonne annonce" };
  if (score <= 84) return { color: "#84cc16", label: "Très bonne annonce" };
  return { color: "#636e40", label: "Annonce optimisée" };
}
