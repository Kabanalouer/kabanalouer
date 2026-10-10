// Étapes des tunnels de conversion comptées côté navigateur (le reste vient
// de la base : inscriptions, annonces, publications). Voir
// supabase/add-funnel-counts.sql et Admin → Santé de la plateforme.
// Chaque étape est envoyée une seule fois par visite (sessionStorage) : on
// compte des visites, pas des clics répétés. Aucun identifiant n'est envoyé.

export const FUNNEL_STEPS = [
  // Voyageur
  "t_visit",          // visite du site (n'importe quelle page publique)
  "t_listing_view",   // fiche chalet vue
  "t_request_click",  // clic « Envoyer la demande » sur la fiche
  "t_auth_prompt",    // … sans être connecté : fenêtre de connexion affichée
  "t_request_sent",   // demande envoyée depuis la fiche
  // Proprio
  "h_landing",        // page Devenir hôte vue
  "h_cta",            // clic « Créer mon annonce » ou import Airbnb
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export function trackFunnelStep(step: FunnelStep): void {
  try {
    const key = `funnel:${step}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage indisponible (navigation privée stricte) : on compte quand même
  }
  try {
    const body = JSON.stringify({ step });
    if (!navigator.sendBeacon?.("/api/funnel", new Blob([body], { type: "application/json" }))) {
      fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // jamais bloquant
  }
}
