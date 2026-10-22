// Photos des pages par thème (versions allégées de public/images/Theme/, 1 600 px WebP). Clé = clé de la page
// thème (lib/amenityLandings.ts, « dogs » pour les chiens). Pas de photo pour la mobilité réduite ni « pas cher » :
// leur en-tête reste le bandeau gris (components/ThemeHero.tsx).
const THEME_IMAGES = new Set(["waterfront", "spa", "dogs", "pool-table", "ev-charger", "remote-work"]);

export function themeImage(key: string): string | null {
  return THEME_IMAGES.has(key) ? `/images/themes/${key}.webp` : null;
}
