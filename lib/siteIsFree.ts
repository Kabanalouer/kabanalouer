// Interrupteur d'AFFICHAGE seulement (demande de Simon, 2026-10-25) : le site visible dit simplement
// « Gratuit », sans durée, sans date et sans « offre ». Ne touche pas au backend : l'abonnement, les prix,
// les rappels et /api/subscriptions/activate-free restent pilotés par lib/launchOffer.ts.
// Pour revenir à l'affichage payant : mettre false (les textes « sans offre » existent encore).
export const SITE_IS_FREE = true;
