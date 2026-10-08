// Courriel de bienvenue envoyé au proprio quand son abonnement annuel devient actif.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const BUTTON_PATH: Record<"fr" | "en", string> = {
  fr: "/dashboard/listings",
  en: "/en/dashboard/listings",
};

export const TEMPLATE_WELCOME_SUBSCRIPTION: EmailTemplateDef = {
  id: "welcome-subscription",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet" },
  ],
  defaults: {
    fr: {
      subject: "Bienvenue {prenom} ! Ton abonnement Kabanalouer est actif",
      greeting: "Bonjour {prenom} !",
      heading: "Ton abonnement est actif !",
      body: "Merci de faire confiance à Kabanalouer. Ton abonnement annuel pour {titreChalet} est maintenant actif — si ce n'est pas déjà fait, complète et publie ton annonce pour commencer à recevoir des demandes de voyageurs.",
      buttonLabel: "Compléter mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subject: "Welcome {prenom}! Your Kabanalouer subscription is active",
      greeting: "Hi {prenom}!",
      heading: "Your subscription is active!",
      body: "Thanks for trusting Kabanalouer. Your annual subscription for {titreChalet} is now active — if you haven't already, complete and publish your listing to start receiving requests from travelers.",
      buttonLabel: "Complete my listing",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
};

// Objet sans prénom : recolle la ponctuation laissée seule
// (« Bienvenue\u202f! » en français, « Welcome! » en anglais).
function tidySubject(subject: string, lang: "fr" | "en"): string {
  return subject
    .replace(/[ \u202f]+(?=[!?])/g, lang === "fr" ? "\u202f" : "")
    .replace(/ +(?=,)/g, "")
    .trim();
}

export async function sendWelcomeSubscriptionEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
}): Promise<{ error: Error | null }> {
  const text = await resolveEmailText(TEMPLATE_WELCOME_SUBSCRIPTION, preferredLanguage, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
  });

  const html = renderEmail({
    lang: preferredLanguage,
    ...text,
    buttonUrl: `${SITE_URL}${BUTTON_PATH[preferredLanguage]}`,
  });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: firstName?.trim() ? text.subject : tidySubject(text.subject, preferredLanguage),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
