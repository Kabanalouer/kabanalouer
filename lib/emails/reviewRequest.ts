import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous = textes par défaut).

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const FOOTER_QUESTION_FR = "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.";
const FOOTER_QUESTION_EN = "Got a question? Just reply to this email — we're happy to help.";

// Objet sans prénom : « {prenom}, comment… » devient « Comment… » (on retire la
// virgule laissée en tête et on remet la majuscule).
function tidySubject(subject: string): string {
  const s = subject.replace(/^[\s,]+/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Courriel initial : choix "J'ai échangé" / "J'ai réservé" ────────────────

export const TEMPLATE_REVIEW_REQUEST: EmailTemplateDef = {
  id: "review-request",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "titreChalet", label: "Titre du chalet" },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, comment s'est passé votre contact avec le propriétaire ?",
      greeting: "Bonjour {prenom},",
      heading: "Partagez votre expérience",
      body: "Vous avez échangé avec le propriétaire de {titreChalet} sur Kabanalouer. On aimerait connaître votre expérience — ça prend 30 secondes.",
      buttonLabel: "J'ai échangé avec le propriétaire",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, how did your contact with the owner go?",
      greeting: "Hi {prenom},",
      heading: "Share your experience",
      body: "You reached out to the owner of {titreChalet} on Kabanalouer. We'd love to hear how it went — it takes 30 seconds.",
      buttonLabel: "I contacted the owner",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

// 2e bouton (« J'ai réservé ») : libellé non modifiable dans l'admin (un seul
// champ « Bouton » par courriel).
const STAY_BUTTON_LABEL = { fr: "J'ai réservé le chalet", en: "I booked the cabin" } as const;

export async function sendReviewRequestEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
  echangeUrl,
  stayUrl,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  echangeUrl: string;
  stayUrl: string;
}): Promise<{ error: Error | null }> {
  const lang = preferredLanguage;
  // Prénom et titre bruts : le résolveur les échappe (données saisies par les utilisateurs).
  const text = await resolveEmailText(TEMPLATE_REVIEW_REQUEST, lang, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
  });
  const html = renderEmail({
    lang,
    ...text,
    buttonUrl: echangeUrl,
    secondaryButtonLabel: STAY_BUTTON_LABEL[lang],
    secondaryButtonUrl: stayUrl,
  });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: tidySubject(text.subject), html });
  return { error: error ? new Error(error.message) : null };
}

// ── 2e courriel : demande d'avis de séjour (check_out + 24h dépassé) ────────

export const TEMPLATE_STAY_REVIEW_REQUEST: EmailTemplateDef = {
  id: "stay-review-request",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "titreChalet", label: "Titre du chalet" },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, comment s'est passé votre séjour ?",
      greeting: "Bonjour {prenom},",
      heading: "Comment s'est passé votre séjour ?",
      body: "Vous avez récemment séjourné à {titreChalet}. Racontez-nous comment ça s'est passé — ça prend 30 secondes et ça aide les prochains voyageurs.",
      buttonLabel: "Laisser mon avis de séjour",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, how was your stay?",
      greeting: "Hi {prenom},",
      heading: "How was your stay?",
      body: "You recently stayed at {titreChalet}. Tell us how it went — it takes 30 seconds and helps future travelers.",
      buttonLabel: "Leave my stay review",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendStayReviewRequestEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
  stayUrl,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  stayUrl: string;
}): Promise<{ error: Error | null }> {
  const lang = preferredLanguage;
  const text = await resolveEmailText(TEMPLATE_STAY_REVIEW_REQUEST, lang, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
  });
  const html = renderEmail({ lang, ...text, buttonUrl: stayUrl });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: tidySubject(text.subject), html });
  return { error: error ? new Error(error.message) : null };
}
