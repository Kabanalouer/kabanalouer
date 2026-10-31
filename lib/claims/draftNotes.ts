// Notes par adresse pour les invitations brouillon envoyées à la main (Admin → Brouillons) : phrase d'ouverture
// personnalisée du courriel (selon le site web du propriétaire), site d'origine, et notifications de relance déjà
// envoyées à Simon (une seule par relance). Table draft_invitation_notes (serveur seulement : RLS sans politique).

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const INTRO_MAX_LENGTH = 600;

export type DraftNote = {
  claim_email: string;
  intro_fr: string | null;
  intro_en: string | null;
  site_url: string | null;
  display_name: string | null;
  reminder_3_notified_at: string | null;
  reminder_10_notified_at: string | null;
};

const NOTE_COLUMNS = "claim_email, intro_fr, intro_en, site_url, display_name, reminder_3_notified_at, reminder_10_notified_at";

// Phrase d'ouverture : texte brut seulement (échappé à l'envoi), espaces nettoyées, bornée. Vide = aucune phrase.
export function cleanIntro(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, INTRO_MAX_LENGTH);
  return text.length > 0 ? text : null;
}

// Nom du chalet ou du site, affiché dans l'objet et le titre de l'invitation (« {nom} sur Kabanalouer ») : texte brut, une ligne, borné.
export const DISPLAY_NAME_MAX_LENGTH = 120;
export function cleanDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
  return text.length > 0 ? text : null;
}

// Adresse du site d'origine : http(s) seulement, sinon rien (jamais un lien javascript: ou autre).
export function cleanSiteUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 300) : null;
  } catch {
    return null;
  }
}

export async function loadDraftNotes(admin: AdminClient): Promise<Map<string, DraftNote>> {
  const { data, error } = await admin.from("draft_invitation_notes").select(NOTE_COLUMNS);
  if (error) {
    console.error("[draftNotes] lecture", error.message);
    return new Map();
  }
  return new Map(((data ?? []) as DraftNote[]).map((n) => [n.claim_email, n]));
}

export async function loadDraftNote(admin: AdminClient, email: string): Promise<DraftNote | null> {
  const { data } = await admin.from("draft_invitation_notes").select(NOTE_COLUMNS).eq("claim_email", email.trim().toLowerCase()).maybeSingle();
  return (data as DraftNote | null) ?? null;
}

export async function saveDraftNote(
  admin: AdminClient,
  email: string,
  fields: { intro_fr?: unknown; intro_en?: unknown; site_url?: unknown; display_name?: unknown }
): Promise<{ error: string | null }> {
  const row: Record<string, unknown> = { claim_email: email.trim().toLowerCase(), updated_at: new Date().toISOString() };
  if ("intro_fr" in fields) row.intro_fr = cleanIntro(fields.intro_fr);
  if ("intro_en" in fields) row.intro_en = cleanIntro(fields.intro_en);
  if ("site_url" in fields) row.site_url = cleanSiteUrl(fields.site_url);
  if ("display_name" in fields) row.display_name = cleanDisplayName(fields.display_name);
  const { error } = await admin.from("draft_invitation_notes").upsert(row, { onConflict: "claim_email" });
  return { error: error ? error.message : null };
}

// Marque la notification de relance comme envoyée à Simon (une seule par adresse et par relance)
export async function markReminderNotified(admin: AdminClient, email: string, kind: "draft_reminder_3" | "draft_reminder_10"): Promise<void> {
  const column = kind === "draft_reminder_3" ? "reminder_3_notified_at" : "reminder_10_notified_at";
  const { error } = await admin
    .from("draft_invitation_notes")
    .upsert({ claim_email: email.trim().toLowerCase(), [column]: new Date().toISOString() }, { onConflict: "claim_email" });
  if (error) console.error("[draftNotes] marque de relance", error.message);
}
