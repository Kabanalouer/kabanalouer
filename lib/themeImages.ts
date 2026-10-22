// Photos des pages par thème (versions allégées de public/images/Theme/, 1 600 px WebP). Clé = clé de la page
// thème (lib/amenityLandings.ts, « dogs » pour les chiens). Clés : « accessible » (mobilité réduite) et « deals » (promos) en plus.
// Une page sans photo garde le bandeau gris (components/ThemeHero.tsx).
const THEME_IMAGES = new Set(["waterfront", "spa", "dogs", "sauna", "pool-table", "ev-charger", "remote-work", "accessible", "deals"]);

export function themeImage(key: string): string | null {
  return THEME_IMAGES.has(key) ? `/images/themes/${key}.webp` : null;
}
