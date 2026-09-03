// Échappement HTML générique pour toute donnée non fiable (nom d'utilisateur,
// titre d'annonce, commentaire libre...) interpolée dans un gabarit HTML —
// courriels notamment, où l'injection casserait la mise en page ou pourrait
// servir à du phishing. Voir lib/jsonLd.ts pour l'équivalent en contexte
// JSON-LD (échappement différent, pas réutilisable ici).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
