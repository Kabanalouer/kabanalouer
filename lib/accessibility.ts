// « Accessible aux personnes à mobilité réduite » — source unique des
// libellés FR/EN, partagée par le dashboard, la fiche publique, le JSON-LD
// (lib/listing-schema.ts) et la page SEO /chalets/accessible-mobilite-reduite.
// Colonnes listings.reduced_mobility / accessibility_features (voir
// supabase/add-reduced-mobility.sql — la contrainte CHECK liste les mêmes ids).

export type AccessibilityFeatureId =
  | "step_free_entrance" | "wide_entrance_door" | "flat_threshold"
  | "step_free_shower" | "grab_bars" | "turning_space"
  | "ground_floor_living" | "bed_clearance" | "wide_hallways";

interface FeatureEntry { id: AccessibilityFeatureId; label: string; labelEn: string }
interface FeatureGroup { id: string; label: string; labelEn: string; features: FeatureEntry[] }

export const ACCESSIBILITY_GROUPS: FeatureGroup[] = [
  {
    id: "entrance", label: "Entrée du chalet", labelEn: "Cabin entrance",
    features: [
      { id: "step_free_entrance", label: "Accès de plain-pied (sans marche) ou via une rampe d'accès", labelEn: "Step-free access or access ramp" },
      { id: "wide_entrance_door", label: "Porte d'entrée large (minimum 81 cm / 32 pouces)", labelEn: "Wide entrance door (at least 32 in / 81 cm)" },
      { id: "flat_threshold", label: "Seuil de porte plat ou très bas (maximum 1,3 cm / 0,5 pouce)", labelEn: "Flat or very low door threshold (0.5 in / 1.3 cm max)" },
    ],
  },
  {
    id: "bathroom", label: "Salle de bain", labelEn: "Bathroom",
    features: [
      { id: "step_free_shower", label: "Douche sans seuil (italienne / de plain-pied)", labelEn: "Step-free (roll-in) shower" },
      { id: "grab_bars", label: "Barres d'appui solidement fixées (toilette et douche)", labelEn: "Securely fixed grab bars (toilet and shower)" },
      { id: "turning_space", label: "Espace de rotation suffisant pour un fauteuil roulant (150 cm / 60 pouces au sol)", labelEn: "Wheelchair turning space (60 in / 150 cm of floor)" },
    ],
  },
  {
    id: "bedroom", label: "Chambre et circulation", labelEn: "Bedroom and circulation",
    features: [
      { id: "ground_floor_living", label: "Rez-de-chaussée complet (chambre, salon et cuisine accessibles sans marches)", labelEn: "Full ground floor (bedroom, living room and kitchen with no steps)" },
      { id: "bed_clearance", label: "Dégagement autour du lit (minimum 92 cm / 36 pouces d'un côté pour le transfert)", labelEn: "Clearance beside the bed (at least 36 in / 92 cm on one side for transfers)" },
      { id: "wide_hallways", label: "Couloirs et passages larges (minimum 92 cm / 36 pouces, sans tapis épais)", labelEn: "Wide hallways and passages (at least 36 in / 92 cm, no thick rugs)" },
    ],
  },
];

const FEATURE_BY_ID = new Map(
  ACCESSIBILITY_GROUPS.flatMap((g) => g.features.map((f) => [f.id, f] as const))
);

export interface AccessibilityInfo {
  accessible: boolean;
  features: AccessibilityFeatureId[];
}

export const ACCESSIBILITY_COLUMNS = "reduced_mobility, accessibility_features";

export function parseAccessibility(row: Record<string, unknown>): AccessibilityInfo {
  const raw = Array.isArray(row.accessibility_features) ? row.accessibility_features : [];
  return {
    accessible: !!row.reduced_mobility,
    features: raw.filter((id): id is AccessibilityFeatureId => typeof id === "string" && FEATURE_BY_ID.has(id as AccessibilityFeatureId)),
  };
}

export function accessibilityFeatureLabel(id: AccessibilityFeatureId, locale: string): string {
  const f = FEATURE_BY_ID.get(id);
  if (!f) return id;
  return locale === "en" ? f.labelEn : f.label;
}

export function accessibleLabel(locale: string): string {
  return locale === "en" ? "Accessible to people with reduced mobility" : "Accessible aux personnes à mobilité réduite";
}

// Détails regroupés par catégorie, dans l'ordre du catalogue — seulement
// les éléments cochés par le proprio, jamais une catégorie vide.
export function groupAccessibilityFeatures(info: AccessibilityInfo, locale: string): { title: string; items: string[] }[] {
  if (!info.accessible) return [];
  const isEn = locale === "en";
  return ACCESSIBILITY_GROUPS
    .map((g) => ({
      title: isEn ? g.labelEn : g.label,
      items: g.features.filter((f) => info.features.includes(f.id)).map((f) => (isEn ? f.labelEn : f.label)),
    }))
    .filter((g) => g.items.length > 0);
}

// Pour les cartes de la page SEO (ex. « 6 éléments d'accessibilité sur 9 »).
export function accessibilityShortSummary(info: AccessibilityInfo, locale: string): string | null {
  if (!info.accessible) return null;
  const total = FEATURE_BY_ID.size;
  const n = info.features.length;
  if (n === 0) return locale === "en" ? "Accessible, details on the listing" : "Accessible, détails sur la fiche";
  return locale === "en"
    ? `${n} of ${total} accessibility features`
    : `${n} élément${n > 1 ? "s" : ""} d'accessibilité sur ${total}`;
}

// Page SEO « location chalet accessible mobilité réduite ».
export const ACCESSIBLE_SLUG_FR = "accessible-mobilite-reduite";
export const ACCESSIBLE_SLUG_EN = "wheelchair-accessible";
export const ACCESSIBLE_PATH_FR = `/chalets/${ACCESSIBLE_SLUG_FR}`;
export const ACCESSIBLE_PATH_EN = `/en/cabins/${ACCESSIBLE_SLUG_EN}`;
