// Interrupteur d'AFFICHAGE seulement (demande de Simon, 2026-10-25) : le site visible dit simplement
// « Gratuit », sans durée, sans date et sans « offre ». Ne touche pas au backend : l'abonnement, les prix,
// les rappels et /api/subscriptions/activate-free restent pilotés par lib/launchOffer.ts.
// Pour revenir à l'affichage payant : mettre false (les textes « sans offre » existent encore).
export const SITE_IS_FREE = true;

// Rappels « fin de l'année gratuite » (30, 10 et 3 jours avant l'échéance, cron subscription-reminders) :
// en pause (2026-10-25, demande de Simon : plus de durée affichée). Remettre à true pour les réactiver ;
// les cases déjà cochées ne sont pas touchées, rien n'est rattrapé à la reprise pour les échéances passées.
export const FREE_YEAR_REMINDERS_ENABLED = false;
