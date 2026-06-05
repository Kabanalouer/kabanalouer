import { slugify } from "./slugify";

const STOPWORDS_FR = new Set([
  "le","la","les","l","un","une","des","et","ou","de","du","d",
  "en","au","aux","ce","se","sur","par","pour","avec","sans","dans","qui","que",
]);

const STOPWORDS_EN = new Set([
  "the","a","an","and","or","of","in","at","to","for","with",
  "by","from","on","as","is","are","was","were",
]);

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function generateSlug(text: string, locale: "fr" | "en"): string {
  const stopwords = locale === "fr" ? STOPWORDS_FR : STOPWORDS_EN;
  const parts = text.split(/[\s|,;:!?#@%/\\()\[\]{}'"+&\-]+/);
  const kept = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !stopwords.has(normalizeWord(p)));
  return slugify(kept.join(" ")).slice(0, 80).replace(/-+$/, "");
}
