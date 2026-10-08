import { AsyncLocalStorage } from "node:async_hooks";
import type { TemplateFields } from "@/lib/emailTemplates/types";

// Contexte d'un envoi de courriel, utilisé par l'aperçu de l'éditeur de textes
// (Admin → Séquences courriel) : le courriel est capturé au lieu d'être envoyé
// (lib/emails/send.ts), avec les textes en cours d'édition, pas encore
// enregistrés (lib/emailTemplates/resolve.ts).
export type CapturedEmail = { subject: string; html: string };

export type EmailContext = {
  capture?: (email: CapturedEmail) => void;
  overrides?: { id: string; lang: "fr" | "en"; fields: TemplateFields };
};

export const emailContext = new AsyncLocalStorage<EmailContext>();
