// Interrupteur des invitations et relances des fiches en brouillon (mode_publication = 'brouillon').
// false (décision de Simon, 2026-10-31) : AUCUNE invitation ni relance brouillon ne part, ni par les crons ni autrement,
// tant que Simon n'a pas fait l'essai complet et validé les textes. Passer à true seulement avec son accord.
// Fichier sans dépendance : il est aussi lu par le catalogue de l'admin (composant client).
export const DRAFT_INVITATIONS_ENABLED = false;
