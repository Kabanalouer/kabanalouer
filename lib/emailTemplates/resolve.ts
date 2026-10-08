import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "@/lib/escapeHtml";
import { emailContext } from "@/lib/emails/emailContext";
import { FIELD_KEYS, type EmailTemplateDef, type Lang, type TemplateFields } from "./types";

// Textes d'un courriel prêts pour renderEmail() : version modifiée dans
// l'admin (table email_templates) si elle existe, sinon texte par défaut du
// code. Ne bloque jamais un envoi : toute erreur de lecture retombe sur le
// texte par défaut.

export type ResolvedEmailText = {
  subject: string;
  greeting?: string;
  heading: string;
  body: string;
  buttonLabel: string;
  footerNote: string;
};

type Vars = Record<string, string | null | undefined>;

const COLUMN: Record<keyof TemplateFields, string> = {
  subject: "subject",
  greeting: "greeting",
  heading: "heading",
  body: "body",
  buttonLabel: "button_label",
  footerNote: "footer_note",
};

export function rowToFields(row: Record<string, unknown>): TemplateFields {
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, typeof row[COLUMN[k]] === "string" ? row[COLUMN[k]] : ""])) as TemplateFields;
}

export function fieldsToRow(fields: TemplateFields): Record<string, string> {
  return Object.fromEntries(FIELD_KEYS.map((k) => [COLUMN[k], fields[k] ?? ""]));
}

async function loadSavedFields(id: string, lang: Lang): Promise<TemplateFields | null> {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await admin.from("email_templates").select("*").eq("email_id", id).eq("lang", lang).maybeSingle();
    if (error) {
      console.error(`[emailTemplates] lecture ${id}/${lang}`, error);
      return null;
    }
    return data ? rowToFields(data) : null;
  } catch (err) {
    console.error(`[emailTemplates] lecture ${id}/${lang}`, err);
    return null;
  }
}

const PLACEHOLDER_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

// Texte → HTML : échappé, **gras**, paragraphes, puis repères remplis.
// Les repères vides sont retirés d'abord, et le nettoyage (gras vide, espace
// double, paragraphe vide) ne touche que le gabarit : les valeurs (message
// d'un voyageur, avis…) sont insérées ensuite, telles quelles.
function toHtml(text: string, def: EmailTemplateDef, vars: Vars): string {
  const htmlKeys = new Set(def.placeholders.filter((p) => p.html).map((p) => p.key));
  const known = new Set(def.placeholders.map((p) => p.key));
  const isEmpty = (key: string) => !(vars[key] ?? "");
  const template = escapeHtml(text.replace(/\r\n/g, "\n").trim())
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n+/g, "<br/><br/>")
    .replace(/\n/g, "<br/>")
    .replace(PLACEHOLDER_RE, (m, key: string) => (known.has(key) && isEmpty(key) ? "" : m))
    .replace(/<strong><\/strong>/g, "")
    .replace(/(<br\/><br\/>){2,}/g, "<br/><br/>")
    .replace(/^(<br\/>)+|(<br\/>)+$/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ ([.,])/g, "$1");
  return template.replace(PLACEHOLDER_RE, (m, key: string) => {
    if (!known.has(key)) return m;
    const value = vars[key] ?? "";
    return htmlKeys.has(key) ? value : escapeHtml(value);
  });
}

// Objet : texte brut. Seuls les blancs ordinaires sont regroupés (les espaces
// insécables françaises restent).
function toPlain(text: string, def: EmailTemplateDef, vars: Vars): string {
  const known = new Set(def.placeholders.filter((p) => !p.html).map((p) => p.key));
  return text
    .replace(/\*\*/g, "")
    .replace(/[ \t\r\n]+/g, " ")
    .replace(PLACEHOLDER_RE, (m, key: string) => (known.has(key) ? vars[key] ?? "" : ""))
    .replace(/ {2,}/g, " ")
    .trim();
}

export async function resolveEmailText(def: EmailTemplateDef, lang: Lang, vars: Vars): Promise<ResolvedEmailText> {
  const preview = emailContext.getStore()?.overrides;
  const fields =
    (preview && preview.id === def.id && preview.lang === lang ? preview.fields : null) ??
    (await loadSavedFields(def.id, lang)) ??
    def.defaults[lang];

  // Formule d'appel omise si un de ses repères est vide (ex. prénom inconnu).
  const greetingKeys = [...fields.greeting.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
  const greetingMissing = greetingKeys.some((k) => !(vars[k] ?? "").trim());

  return {
    subject: toPlain(fields.subject, def, vars),
    greeting: fields.greeting.trim() && !greetingMissing ? toHtml(fields.greeting, def, vars) : undefined,
    heading: toHtml(fields.heading, def, vars),
    body: toHtml(fields.body, def, vars),
    buttonLabel: toHtml(fields.buttonLabel, def, vars),
    footerNote: toHtml(fields.footerNote, def, vars),
  };
}
