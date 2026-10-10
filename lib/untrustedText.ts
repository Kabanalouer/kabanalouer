// Textes non fiables et IA (rapport du lundi, analyse des retours des proprios).
//
// Entrée : fenceUntrusted() met les données entre balises <donnees> en JSON,
// avec < et > échappés — aucune balise ne peut y être reconstituée.
//
// Sortie : sanitizeAiOutput() applique la typographie française du site
// (espace fine insécable avant ? ! ; et insécable avant :) et retire tout
// lien, domaine, courriel ou numéro de téléphone, même si un texte non fiable
// a réussi à en faire recopier un par l'IA. Normalisation Unicode d'abord
// (caractères pleine chasse, caractères invisibles) pour que le filtre voie
// le vrai texte.

export function fenceUntrusted(data: unknown): string {
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  return `<donnees>\n${json}\n</donnees>`;
}

const INVISIBLE = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g;
const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/\S+|\bwww\.\S+/gi;
const EMAIL_RE = /[\w.+-]+\s*(?:@|\[at\]|\(at\))\s*[\w-]+(?:\.[\w-]+)+/gi;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}\b(?:\/\S*)?/gi;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const ALLOWED_DOMAINS = new Set(["kabanalouer.ca"]);

export function sanitizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(URL_RE, "[lien retiré]")
    .replace(EMAIL_RE, "[courriel retiré]")
    .replace(DOMAIN_RE, (m) => (ALLOWED_DOMAINS.has(m.toLowerCase()) ? m : "[lien retiré]"))
    .replace(PHONE_RE, "[numéro retiré]")
    .replace(/ ([?!;])/g, "\u202F$1")
    .replace(/ :/g, "\u00A0:");
}

export function sanitizeAiOutput<T>(value: T): T {
  if (typeof value === "string") return sanitizeText(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeAiOutput) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeAiOutput(v)])) as T;
  return value;
}
