// Nettoyage du texte brut retourné par l'IA pour une description d'annonce —
// partagé entre generate-description et l'import Airbnb/VRBO.

export function cleanDescription(text: string): string {
  const lines = text.split("\n");
  // Retire les lignes commençant par # ou ** (en-têtes, labels en gras)
  const filtered = lines.filter((line) => !line.trimStart().startsWith("#") && !line.trimStart().startsWith("**"));
  // Retire les lignes vides en début de texte
  while (filtered.length > 0 && filtered[0].trim() === "") filtered.shift();
  return filtered.join("\n").trimEnd();
}

export function truncateToLastSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("!\n"),
    truncated.lastIndexOf("?\n")
  );
  if (lastSentenceEnd > max * 0.5) return text.slice(0, lastSentenceEnd + 1).trimEnd();
  return truncated.trimEnd();
}
