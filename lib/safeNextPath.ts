// Chemin de retour après connexion/inscription (?next=…) : seulement un chemin
// interne au site. « //site.com » et « /\site.com » sont des adresses vers un
// autre site pour le navigateur — refusés (lien piégé d'hameçonnage).
export function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) {
    return fallback;
  }
  return raw;
}
