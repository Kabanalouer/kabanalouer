// Nombres selon la langue du visiteur : « 4,8 » / « 12,5 % » en français,
// « 4.8 » / « 12.5% » en anglais. Ne jamais utiliser toFixed() pour un nombre affiché.
function intlLocale(locale: string) {
  return locale === "en" ? "en-CA" : "fr-CA";
}

export function formatDecimal(value: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// `ratio` entre 0 et 1 (ex. 0.125 → « 12,5 % »)
export function formatPercent(ratio: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}
