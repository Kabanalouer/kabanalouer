import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_WELCOME_TRAVELER = textes par défaut).

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export const TEMPLATE_WELCOME_TRAVELER: EmailTemplateDef = {
  id: "welcome-traveler",
  placeholders: [{ key: "prenom", label: "Prénom du voyageur" }],
  defaults: {
    fr: {
      subject: "Bienvenue {prenom} !",
      greeting: "Bonjour {prenom} !",
      heading: "Ton compte est prêt !",
      body: "Tu peux maintenant explorer les chalets du Québec et contacter les propriétaires directement — sans frais de service.",
      buttonLabel: "Voir les chalets",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subject: "Welcome {prenom}!",
      greeting: "Hi {prenom}!",
      heading: "Your account is ready!",
      body: "You can now explore cabins across Québec and contact owners directly — no service fees.",
      buttonLabel: "Browse cabins",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
};

export async function sendWelcomeTravelerEmail({
  email,
  preferredLanguage,
  firstName,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
}): Promise<{ error: Error | null }> {
  const lang = preferredLanguage;
  const text = await resolveEmailText(TEMPLATE_WELCOME_TRAVELER, lang, { prenom: firstName?.trim() });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${lang === "en" ? "/en" : "/"}` });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Réclame atomiquement le "droit d'envoyer" l'email de bienvenue voyageur.
// Retourne les données du profil si cet appel a bien gagné la course (welcome_email_sent
// passait de false à true) — retourne null si déjà envoyé ailleurs, ou si role != 'traveler'.
// Postgres verrouille la ligne au niveau ligne : peu importe le nombre d'appels concurrents,
// un seul peut faire passer la colonne à true, les autres ne trouvent plus rien à modifier.
export async function claimTravelerWelcomeSlot(
  supabase: SupabaseClient,
  userId: string
): Promise<{ name: string | null; preferred_language: string | null } | null> {
  const { data } = await supabase
    .from("users")
    .update({ welcome_email_sent: true })
    .eq("id", userId)
    .eq("role", "traveler")
    .eq("welcome_email_sent", false)
    .select("name, preferred_language")
    .maybeSingle();

  return data ?? null;
}
