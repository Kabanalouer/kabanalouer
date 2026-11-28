// Typographie française (règle OQLF du projet, voir CLAUDE.md section 4) appliquée à un texte de page :
// - apostrophe typographique ’
// - espace fine insécable (U+202F) avant ? ! ;
// - espace insécable (U+00A0) avant : et entre un nombre et $
// Pour du texte lu par les gens et les moteurs (titres, paragraphes, FAQ, JSON-LD), jamais pour une adresse ni du balisage.
// Les adresses des liens `[texte](adresse)` sont laissées intactes : une espace avant le « ? » d'une adresse la casse (404).
export function fr(text: string): string {
  return text
    .split(/(\]\([^)]*\))/)
    .map((part, i) => (i % 2 === 1 ? part : frPlain(part)))
    .join("");
}

function frPlain(text: string): string {
  return text
    .replace(/'/g, "’")
    .replace(/[   ]*([?!;])/g, " $1")
    .replace(/[   ]*:/g, " :")
    .replace(/(\d)[   ]*\$/g, "$1 $");
}
