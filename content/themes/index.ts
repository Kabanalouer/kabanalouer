import bordDeLEau from "./bord-de-l-eau";
import avecSpa from "./avec-spa";
import { TO_PROVIDE, isThemeContentReady, type ThemeContent } from "./types";

export { TO_PROVIDE, isThemeContentReady };
export type { ThemeContent };

// Autres thèmes : même structure, textes à fournir par Simon thème par thème. Tant que `guide` et `faq` valent
// « [À FOURNIR] », la nouvelle version n'est pas activée : leurs pages gardent le gabarit actuel (AmenityLanding,
// ComboLanding, DogFriendlyLanding…).
function pending(
  slug: string,
  label: string,
  labelPlural: string,
  breadcrumbLabel: string,
  h1Base: string,
  titleOwner: string
): ThemeContent {
  return { slug, label, labelPlural, breadcrumbLabel, h1Base, active: false, guide: TO_PROVIDE, faq: TO_PROVIDE, titleOwner };
}

export const THEMES: ThemeContent[] = [
  bordDeLEau,
  avecSpa,
  pending("chiens-acceptes", "qui accepte les chiens", "chalets qui acceptent les chiens", "Chiens acceptés", "Location de chalet avec chien", "Votre chalet accepte les chiens ? Ajoutez-le gratuitement"),
  pending("avec-sauna", "avec sauna", "chalets avec sauna", "Avec sauna", "Location de chalet avec sauna", "Votre chalet a un sauna ? Ajoutez-le gratuitement"),
  pending("teletravail", "pour le télétravail", "chalets pour le télétravail", "Télétravail", "Location de chalet pour le télétravail", "Votre chalet convient au télétravail ? Ajoutez-le gratuitement"),
  pending("table-de-billard", "avec table de billard", "chalets avec table de billard", "Table de billard", "Location de chalet avec table de billard", "Votre chalet a une table de billard ? Ajoutez-le gratuitement"),
  pending("borne-de-recharge", "avec borne de recharge", "chalets avec borne de recharge", "Borne de recharge", "Location de chalet avec borne de recharge", "Votre chalet a une borne de recharge ? Ajoutez-le gratuitement"),
  pending("accessible-mobilite-reduite", "accessible", "chalets accessibles", "Mobilité réduite", "Location de chalet accessible", "Votre chalet est accessible ? Ajoutez-le gratuitement"),
  pending("pas-cher", "pas cher", "chalets pas chers", "Pas chers", "Location de chalet pas cher", "Votre chalet est abordable ? Ajoutez-le gratuitement"),
];

// Thèmes dont la nouvelle version du gabarit est activée (contenu fourni)
export function getActiveTheme(slug: string): ThemeContent | undefined {
  return THEMES.find((t) => t.slug === slug && isThemeContentReady(t));
}
