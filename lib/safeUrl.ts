// Empêche le rendu d'un `href` avec un schéma dangereux (javascript:, data:...)
// quand la valeur vient d'une donnée stockée plutôt que d'un littéral codé en
// dur — n'autorise que http/https.
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
