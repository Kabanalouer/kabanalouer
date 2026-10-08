// Relances envoyées au proprio dont l'abonnement n'est plus actif (annonce
// invisible) : après 3 jours, puis après 14 jours.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef, PlaceholderDef } from "@/lib/emailTemplates/types";

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type WinbackThreshold = 3 | 14;

const PLACEHOLDERS: PlaceholderDef[] = [
  { key: "prenom", label: "Prénom du proprio" },
  { key: "titreChalet", label: "Titre du chalet" },
];

const FOOTER_QUESTION_FR = "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.";
const FOOTER_QUESTION_EN = "Got a question? Just reply to this email — we're happy to help.";

export const TEMPLATE_WINBACK_3: EmailTemplateDef = {
  id: "winback-3",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{prenom}, ton annonce Kabanalouer est invisible pour l'instant",
      greeting: "Bonjour {prenom} !",
      heading: "Ton annonce n'apparaît plus dans les résultats",
      body: "Depuis quelques jours, {titreChalet} est invisible pour les voyageurs qui cherchent un chalet — ton abonnement Kabanalouer n'est plus actif. Rien n'est perdu : ta fiche, tes photos, tes avis sont toujours là. Réactive ton abonnement pour la rendre visible à nouveau.",
      buttonLabel: "Réactiver mon abonnement",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your Kabanalouer listing is currently invisible",
      greeting: "Hi {prenom}!",
      heading: "Your listing isn't showing up in search results",
      body: "For a few days now, {titreChalet} has been invisible to travelers searching for a cabin — your Kabanalouer subscription is no longer active. Nothing is lost: your listing, photos, and reviews are all still there. Reactivate your subscription to make it visible again.",
      buttonLabel: "Reactivate my subscription",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export const TEMPLATE_WINBACK_14: EmailTemplateDef = {
  id: "winback-14",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{prenom}, 14 jours que ton annonce est invisible — des voyageurs te cherchent peut-être",
      greeting: "Bonjour {prenom} !",
      heading: "14 jours d'invisibilité, des réservations potentiellement manquées",
      body: "{titreChalet} est invisible depuis 14 jours — pendant ce temps, des voyageurs qui cherchaient un chalet dans ta région n'ont pas pu te trouver. Rien n'est perdu : ta fiche, tes photos, tes avis sont toujours intacts. Réactive ton abonnement pour redevenir visible.",
      buttonLabel: "Réactiver mon abonnement",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, 14 days invisible — travelers may be missing your listing",
      greeting: "Hi {prenom}!",
      heading: "14 days of invisibility, potentially missed bookings",
      body: "{titreChalet} has been invisible for 14 days — during that time, travelers searching for a cabin in your area couldn't find you. Nothing is lost: your listing, photos, and reviews are all still intact. Reactivate your subscription to become visible again.",
      buttonLabel: "Reactivate my subscription",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

const TEMPLATES: Record<WinbackThreshold, EmailTemplateDef> = {
  3: TEMPLATE_WINBACK_3,
  14: TEMPLATE_WINBACK_14,
};

// Objet sans prénom : « , ton annonce… » → « Ton annonce… ».
function tidySubject(subject: string): string {
  const s = subject.replace(/^[\s,]+/, "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function sendWinbackReminderEmail({
  email,
  preferredLanguage,
  firstName,
  threshold,
  listingTitle,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  threshold: WinbackThreshold;
  listingTitle: string;
}): Promise<{ error: Error | null }> {
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const text = await resolveEmailText(TEMPLATES[threshold], preferredLanguage, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
  });

  const html = renderEmail({
    lang: preferredLanguage,
    ...text,
    buttonUrl: `${SITE_URL}${buttonPath}`,
  });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: firstName?.trim() ? text.subject : tidySubject(text.subject),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
