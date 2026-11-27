// Titres d'annonces longs (« Cachette Sérendipité | Lac, ski, patin et raquette ») : le nom est la partie avant le
// premier « | », « - » ou « – » (entourés d'espaces) ; l'accroche est ce qui suit. Sans séparateur, tout le titre
// est le nom et l'accroche est vide. Le titre complet reste utilisé pour l'attribut alt et le title du lien.
export function splitListingTitle(title: string): { name: string; tagline: string } {
  const trimmed = (title ?? "").trim();
  const match = /\s[|\-–]\s/.exec(trimmed);
  if (!match) return { name: trimmed, tagline: "" };
  return {
    name: trimmed.slice(0, match.index).trim(),
    tagline: trimmed.slice(match.index + match[0].length).trim(),
  };
}
