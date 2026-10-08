// Textes modifiables des courriels (Admin → Séquences courriel). Partagé entre
// le serveur (lib/emailTemplates/resolve.ts) et l'éditeur de l'admin.
//
// Syntaxe des textes : {repere} = valeur remplie à l'envoi (prénom, titre du
// chalet, date…) ; **texte** = gras ; ligne vide = nouveau paragraphe ; retour
// à la ligne simple = saut de ligne.

export type Lang = "fr" | "en";

export type TemplateFields = {
  subject: string;
  greeting: string;
  heading: string;
  body: string;
  buttonLabel: string;
  footerNote: string;
};

export const FIELD_KEYS = ["subject", "greeting", "heading", "body", "buttonLabel", "footerNote"] as const;

export const FIELD_LABELS: Record<keyof TemplateFields, string> = {
  subject: "Objet",
  greeting: "Formule d’appel",
  heading: "Titre",
  body: "Texte",
  buttonLabel: "Bouton",
  footerNote: "Note de bas de page",
};

// Champs qui ne peuvent pas être vides.
export const REQUIRED_FIELDS: (keyof TemplateFields)[] = ["subject", "heading", "body", "buttonLabel"];

export type PlaceholderDef = {
  key: string;
  // Description affichée dans l'éditeur, ex. « Prénom du proprio ».
  label: string;
  // Bloc HTML construit par le code (paragraphe d'offre, liste d'étapes…) :
  // inséré tel quel, jamais dans l'objet.
  html?: boolean;
};

export type EmailTemplateDef = {
  id: string;
  placeholders: PlaceholderDef[];
  defaults: Record<Lang, TemplateFields>;
};

const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
}

// Repères inconnus (fautes de frappe) et champs obligatoires vides.
export function validateFields(def: EmailTemplateDef, fields: TemplateFields): string[] {
  const known = new Set(def.placeholders.map((p) => p.key));
  const htmlKeys = new Set(def.placeholders.filter((p) => p.html).map((p) => p.key));
  const errors: string[] = [];
  for (const key of FIELD_KEYS) {
    const value = fields[key] ?? "";
    if (REQUIRED_FIELDS.includes(key) && !value.trim()) errors.push(`« ${FIELD_LABELS[key]} » ne peut pas être vide.`);
    for (const p of placeholdersIn(value)) {
      if (!known.has(p)) errors.push(`Repère inconnu dans « ${FIELD_LABELS[key]} » : {${p}}`);
      else if (key === "subject" && htmlKeys.has(p)) errors.push(`Le repère {${p}} ne peut pas aller dans l’objet.`);
    }
  }
  return errors;
}
