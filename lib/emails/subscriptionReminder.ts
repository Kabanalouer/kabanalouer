import { SITE_URL } from "@/lib/siteUrl";
import { formatPriceLabel } from "@/lib/subscriptionPricing";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type ReminderThreshold = 30 | 10 | 3;

const FOOTER_QUESTION_FR = "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.";
const FOOTER_QUESTION_EN = "Got a question? Just reply to this email — we're happy to help.";

const PLACEHOLDER_PRENOM = { key: "prenom", label: "Prénom du proprio" };
const PLACEHOLDER_TITRE = { key: "titreChalet", label: "Titre du chalet" };

// Sans prénom, l'objet « {prenom}, ton abonnement… » deviendrait
// « , ton abonnement… » : on retire la virgule de tête et on remet la
// majuscule (« Ton abonnement… »), comme l'ancien objet générique.
function subjectWithoutMissingName(subject: string): string {
  const stripped = subject.replace(/^[\s,]+/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

const REMINDER_PLACEHOLDERS = [
  PLACEHOLDER_PRENOM,
  PLACEHOLDER_TITRE,
  { key: "dateFin", label: "Date de fin de l’abonnement (ou de l’accès gratuit)" },
];

export const TEMPLATE_REMINDER_30: EmailTemplateDef = {
  id: "reminder-30",
  placeholders: REMINDER_PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{prenom}, ton abonnement Kabanalouer expire dans 30 jours",
      greeting: "Bonjour {prenom} !",
      heading: "Ton abonnement expire dans 30 jours",
      body: "Un petit rappel amical : ton accès gratuit (offre de lancement) pour {titreChalet} arrive à échéance le {dateFin}. Renouvelle ton abonnement dès maintenant pour que ton annonce reste visible sans interruption.",
      buttonLabel: "Renouveler mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your Kabanalouer subscription expires in 30 days",
      greeting: "Hi {prenom}!",
      heading: "Your subscription expires in 30 days",
      body: "Just a friendly reminder: your free launch access for {titreChalet} expires on {dateFin}. Renew your subscription now so your listing stays visible without interruption.",
      buttonLabel: "Renew my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export const TEMPLATE_REMINDER_10: EmailTemplateDef = {
  id: "reminder-10",
  placeholders: REMINDER_PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{prenom}, il reste 10 jours avant l'expiration de ton abonnement",
      greeting: "Bonjour {prenom} !",
      heading: "Plus que 10 jours",
      body: "Ton abonnement Kabanalouer pour {titreChalet} expire le {dateFin}, dans 10 jours. Renouvelle ton abonnement dès maintenant pour éviter toute interruption.",
      buttonLabel: "Renouveler mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, 10 days left before your subscription expires",
      greeting: "Hi {prenom}!",
      heading: "Only 10 days left",
      body: "Your Kabanalouer subscription for {titreChalet} expires on {dateFin}, in 10 days. Renew your subscription now to avoid any interruption.",
      buttonLabel: "Renew my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export const TEMPLATE_REMINDER_3: EmailTemplateDef = {
  id: "reminder-3",
  placeholders: REMINDER_PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{prenom}, ton abonnement expire dans 3 jours",
      greeting: "Bonjour {prenom} !",
      heading: "Dernier rappel : 3 jours",
      body: "Ton abonnement Kabanalouer pour {titreChalet} expire le {dateFin}. Si rien ne change avant cette date, ton annonce disparaîtra des résultats de recherche. Renouvelle ton abonnement dès aujourd'hui pour l'éviter.",
      buttonLabel: "Renouveler mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your subscription expires in 3 days",
      greeting: "Hi {prenom}!",
      heading: "Last reminder: 3 days left",
      body: "Your Kabanalouer subscription for {titreChalet} expires on {dateFin}. If nothing changes before then, your listing will disappear from search results. Renew your subscription today to avoid that.",
      buttonLabel: "Renew my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

const REMINDER_TEMPLATES: Record<ReminderThreshold, EmailTemplateDef> = {
  30: TEMPLATE_REMINDER_30,
  10: TEMPLATE_REMINDER_10,
  3: TEMPLATE_REMINDER_3,
};

function formatExpiryDate(expiresAt: Date, lang: "fr" | "en"): string {
  return expiresAt.toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendSubscriptionReminderEmail({
  email,
  preferredLanguage,
  firstName,
  threshold,
  expiresAt,
  listingTitle,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  threshold: ReminderThreshold;
  expiresAt: Date;
  listingTitle: string;
}): Promise<{ error: Error | null }> {
  const prenom = firstName?.trim() || undefined;
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const text = await resolveEmailText(REMINDER_TEMPLATES[threshold], preferredLanguage, {
    prenom,
    titreChalet: listingTitle,
    dateFin: formatExpiryDate(expiresAt, preferredLanguage),
  });
  const html = renderEmail({ lang: preferredLanguage, ...text, buttonUrl: `${SITE_URL}${buttonPath}` });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: prenom ? text.subject : subjectWithoutMissingName(text.subject),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}

// ── Renouvellement automatique (abonnements payants Stripe) ─────────────────
// Rappel unique et informatif — contrairement au cas offre de lancement,
// aucune action n'est requise : Stripe facture automatiquement.
export const TEMPLATE_AUTO_RENEWAL: EmailTemplateDef = {
  id: "auto-renewal",
  placeholders: [
    PLACEHOLDER_PRENOM,
    PLACEHOLDER_TITRE,
    { key: "dateRenouvellement", label: "Date du renouvellement automatique" },
    { key: "prix", label: "Prix annuel de l’abonnement (ex. « 299 $ »)" },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, ton abonnement Kabanalouer se renouvelle automatiquement le {dateRenouvellement}",
      greeting: "Bonjour {prenom} !",
      heading: "Renouvellement automatique le {dateRenouvellement}",
      body: "Ton abonnement annuel Kabanalouer pour {titreChalet} ({prix}) sera renouvelé automatiquement le {dateRenouvellement} — tu n'as rien à faire. Si tu veux mettre à jour ta méthode de paiement ou annuler ton abonnement, tu peux le faire à tout moment.",
      buttonLabel: "Gérer mon abonnement",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your Kabanalouer subscription renews automatically on {dateRenouvellement}",
      greeting: "Hi {prenom}!",
      heading: "Automatic renewal on {dateRenouvellement}",
      body: "Your annual Kabanalouer subscription for {titreChalet} ({prix}) will renew automatically on {dateRenouvellement} — no action needed on your part. If you'd like to update your payment method or cancel your subscription, you can do so anytime.",
      buttonLabel: "Manage my subscription",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendAutoRenewalReminderEmail({
  email,
  preferredLanguage,
  firstName,
  expiresAt,
  listingTitle,
  priceCents,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  expiresAt: Date;
  listingTitle: string;
  priceCents: number;
}): Promise<{ error: Error | null }> {
  const prenom = firstName?.trim() || undefined;
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const text = await resolveEmailText(TEMPLATE_AUTO_RENEWAL, preferredLanguage, {
    prenom,
    titreChalet: listingTitle,
    dateRenouvellement: formatExpiryDate(expiresAt, preferredLanguage),
    prix: formatPriceLabel(priceCents, preferredLanguage),
  });
  const html = renderEmail({ lang: preferredLanguage, ...text, buttonUrl: `${SITE_URL}${buttonPath}` });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: prenom ? text.subject : subjectWithoutMissingName(text.subject),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}

// ── Paiement échoué (abonnements payants, status = 'past_due') ──────────────
export const TEMPLATE_PAYMENT_FAILED: EmailTemplateDef = {
  id: "payment-failed",
  placeholders: [
    PLACEHOLDER_PRENOM,
    PLACEHOLDER_TITRE,
    { key: "prix", label: "Prix annuel de l’abonnement (ex. « 299 $ »)" },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, le paiement de ton abonnement Kabanalouer a échoué",
      greeting: "Bonjour {prenom} !",
      heading: "Ton paiement n'a pas pu être traité",
      body: "Le renouvellement automatique de ton abonnement annuel pour {titreChalet} ({prix}) n'a pas fonctionné — ta carte a probablement été refusée. Stripe va retenter automatiquement dans les prochains jours, mais tu peux aussi mettre à jour ta méthode de paiement dès maintenant pour éviter toute interruption.",
      buttonLabel: "Mettre à jour mon paiement",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your Kabanalouer subscription payment failed",
      greeting: "Hi {prenom}!",
      heading: "Your payment couldn't be processed",
      body: "The automatic renewal of your annual subscription for {titreChalet} ({prix}) didn't go through — your card was likely declined. Stripe will automatically retry over the next few days, but you can also update your payment method now to avoid any interruption.",
      buttonLabel: "Update my payment method",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendPaymentFailedEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
  priceCents,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  priceCents: number | null;
}): Promise<{ error: Error | null }> {
  const prenom = firstName?.trim() || undefined;
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const text = await resolveEmailText(TEMPLATE_PAYMENT_FAILED, preferredLanguage, {
    prenom,
    titreChalet: listingTitle,
    prix: formatPriceLabel(priceCents ?? 0, preferredLanguage),
  });
  const html = renderEmail({ lang: preferredLanguage, ...text, buttonUrl: `${SITE_URL}${buttonPath}` });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: prenom ? text.subject : subjectWithoutMissingName(text.subject),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
