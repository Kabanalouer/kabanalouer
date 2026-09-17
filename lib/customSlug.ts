export const CUSTOM_SLUG_MAX_LENGTH = 60;

// Minuscules, chiffres, tirets seulement — jamais de tiret en début/fin ni
// consécutif, pour rester un segment d'URL propre.
const CUSTOM_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type CustomSlugFormatError = "format" | "numericOnly";

// Un lien personnalisé purement numérique serait ambigu avec un
// listing_number dans la recherche par segment d'URL (voir
// app/chalets/[...segments]/page.tsx) — interdit explicitement plutôt que de
// gérer ce cas particulier au moment de la résolution de route.
export function validateCustomSlugFormat(value: string): CustomSlugFormatError | null {
  if (/^\d+$/.test(value)) return "numericOnly";
  if (value.length > CUSTOM_SLUG_MAX_LENGTH || !CUSTOM_SLUG_PATTERN.test(value)) return "format";
  return null;
}
