// JSON.stringify n'échappe pas "</script>" — du contenu non fiable (ex. un
// titre/description scrapé) contenant cette séquence casserait hors d'un bloc
// <script type="application/ld+json"> et s'exécuterait comme un vrai script.
// Toujours passer par cette fonction pour injecter du JSON-LD contenant des
// données qui ne sont pas 100 % du texte statique codé en dur.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
