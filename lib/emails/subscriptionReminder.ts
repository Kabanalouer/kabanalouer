import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type ReminderThreshold = 30 | 10 | 3;

const TEMPLATES: Record<ReminderThreshold, Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (dateStr: string) => string;
  buttonLabel: string;
  footerNote: string;
}>> = {
  30: {
    fr: {
      subjectGeneric: "Ton abonnement Kabanalouer expire dans 30 jours",
      subjectNamed: (firstName) => `${firstName}, ton abonnement Kabanalouer expire dans 30 jours`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "Ton abonnement expire dans 30 jours",
      body: (dateStr) => `Un petit rappel amical : ton accès gratuit (offre de lancement) arrive à échéance le ${dateStr}. Renouvelle ton abonnement dès maintenant pour que ton annonce reste visible sans interruption.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "Your Kabanalouer subscription expires in 30 days",
      subjectNamed: (firstName) => `${firstName}, your Kabanalouer subscription expires in 30 days`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Your subscription expires in 30 days",
      body: (dateStr) => `Just a friendly reminder: your free launch access expires on ${dateStr}. Renew your subscription now so your listing stays visible without interruption.`,
      buttonLabel: "Renew my listing",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
  10: {
    fr: {
      subjectGeneric: "Il reste 10 jours avant l'expiration de ton abonnement",
      subjectNamed: (firstName) => `${firstName}, il reste 10 jours avant l'expiration de ton abonnement`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "Plus que 10 jours",
      body: (dateStr) => `Ton abonnement Kabanalouer expire le ${dateStr}, dans 10 jours. Renouvelle ton abonnement dès maintenant pour éviter toute interruption.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "10 days left before your subscription expires",
      subjectNamed: (firstName) => `${firstName}, 10 days left before your subscription expires`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Only 10 days left",
      body: (dateStr) => `Your Kabanalouer subscription expires on ${dateStr}, in 10 days. Renew your subscription now to avoid any interruption.`,
      buttonLabel: "Renew my listing",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
  3: {
    fr: {
      subjectGeneric: "Ton abonnement expire dans 3 jours",
      subjectNamed: (firstName) => `${firstName}, ton abonnement expire dans 3 jours`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "Dernier rappel : 3 jours",
      body: (dateStr) => `Ton abonnement Kabanalouer expire le ${dateStr}. Si rien ne change avant cette date, ton annonce disparaîtra des résultats de recherche. Renouvelle ton abonnement dès aujourd'hui pour l'éviter.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "Your subscription expires in 3 days",
      subjectNamed: (firstName) => `${firstName}, your subscription expires in 3 days`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Last reminder: 3 days left",
      body: (dateStr) => `Your Kabanalouer subscription expires on ${dateStr}. If nothing changes before then, your listing will disappear from search results. Renew your subscription today to avoid that.`,
      buttonLabel: "Renew my listing",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
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
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  threshold: ReminderThreshold;
  expiresAt: Date;
}): Promise<{ error: Error | null }> {
  const template = TEMPLATES[threshold][preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const dateStr = formatExpiryDate(expiresAt, preferredLanguage);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(dateStr),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${buttonPath}`,
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

// ── Renouvellement automatique (abonnements payants Stripe) ─────────────────
// Rappel unique et informatif — contrairement au cas offre de lancement,
// aucune action n'est requise : Stripe facture automatiquement.
const AUTO_RENEWAL_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: (dateStr: string) => string;
  subjectNamed: (firstName: string, dateStr: string) => string;
  greeting: (firstName: string) => string;
  heading: (dateStr: string) => string;
  body: (dateStr: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (dateStr) => `Ton abonnement Kabanalouer se renouvelle automatiquement le ${dateStr}`,
    subjectNamed: (firstName, dateStr) => `${firstName}, ton abonnement Kabanalouer se renouvelle automatiquement le ${dateStr}`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: (dateStr) => `Renouvellement automatique le ${dateStr}`,
    body: (dateStr) => `Ton abonnement annuel Kabanalouer (299 $) sera renouvelé automatiquement le ${dateStr} — tu n'as rien à faire. Si tu veux mettre à jour ta méthode de paiement ou annuler ton abonnement, tu peux le faire à tout moment.`,
    buttonLabel: "Gérer mon abonnement",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (dateStr) => `Your Kabanalouer subscription renews automatically on ${dateStr}`,
    subjectNamed: (firstName, dateStr) => `${firstName}, your Kabanalouer subscription renews automatically on ${dateStr}`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: (dateStr) => `Automatic renewal on ${dateStr}`,
    body: (dateStr) => `Your annual Kabanalouer subscription ($299) will renew automatically on ${dateStr} — no action needed on your part. If you'd like to update your payment method or cancel your subscription, you can do so anytime.`,
    buttonLabel: "Manage my subscription",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendAutoRenewalReminderEmail({
  email,
  preferredLanguage,
  firstName,
  expiresAt,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  expiresAt: Date;
}): Promise<{ error: Error | null }> {
  const template = AUTO_RENEWAL_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const dateStr = formatExpiryDate(expiresAt, preferredLanguage);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading(dateStr),
    body: template.body(dateStr),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${buttonPath}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName, dateStr) : template.subjectGeneric(dateStr),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
