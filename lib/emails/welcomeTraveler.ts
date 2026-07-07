import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const TEMPLATES: Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonPath: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Bienvenue sur Kabanalouer !",
    subjectNamed: (firstName) => `Bienvenue ${firstName} !`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ton compte est prêt !",
    body: "Tu peux maintenant explorer les chalets du Québec et contacter les propriétaires directement — sans frais de service.",
    buttonLabel: "Voir les chalets",
    buttonPath: "/chalets",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "Welcome to Kabanalouer!",
    subjectNamed: (firstName) => `Welcome ${firstName}!`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your account is ready!",
    body: "You can now explore cabins across Québec and contact owners directly — no service fees.",
    buttonLabel: "Browse cabins",
    buttonPath: "/en/cabins",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
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
  const template = TEMPLATES[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body,
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${template.buttonPath}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName) : template.subjectGeneric,
    html,
  });

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
