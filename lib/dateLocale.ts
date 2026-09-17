// Noms de mois/jours localisés — partagé entre AvailabilityView.tsx et
// ContactForm.tsx (qui dupliquaient chacun leur propre liste figée en
// français, cassant l'affichage du calendrier en anglais).

export function getMonthNames(locale: string): string[] {
  const intlLocale = locale === "en" ? "en-CA" : "fr-CA";
  return Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i, 1).toLocaleDateString(intlLocale, { month: "long" })
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export function getMonthNamesShort(locale: string): string[] {
  const intlLocale = locale === "en" ? "en-CA" : "fr-CA";
  return Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i, 1).toLocaleDateString(intlLocale, { month: "short" }).replace(".", "")
  );
}

export function getDayNames(locale: string): string[] {
  const intlLocale = locale === "en" ? "en-CA" : "fr-CA";
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2025, 0, 5 + i).toLocaleDateString(intlLocale, { weekday: "short" })
      .replace(".", "").slice(0, 3)
      .replace(/^./, (c) => c.toUpperCase())
  );
}
