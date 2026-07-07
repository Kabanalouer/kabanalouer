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
  body: (dateStr: string, listingTitle: string) => string;
  buttonLabel: string;
  footerNote: string;
}>> = {
  30: {
    fr: {
      subjectGeneric: "Ton abonnement Kabanalouer expire dans 30 jours",
      subjectNamed: (firstName) => `${firstName}, ton abonnement Kabanalouer expire dans 30 jours`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "Ton abonnement expire dans 30 jours",
      body: (dateStr, listingTitle) => `Un petit rappel amical : ton accès gratuit (offre de lancement) pour ${listingTitle} arrive à échéance le ${dateStr}. Renouvelle ton abonnement dès maintenant pour que ton annonce reste visible sans interruption.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "Your Kabanalouer subscription expires in 30 days",
      subjectNamed: (firstName) => `${firstName}, your Kabanalouer subscription expires in 30 days`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Your subscription expires in 30 days",
      body: (dateStr, listingTitle) => `Just a friendly reminder: your free launch access for ${listingTitle} expires on ${dateStr}. Renew your subscription now so your listing stays visible without interruption.`,
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
      body: (dateStr, listingTitle) => `Ton abonnement Kabanalouer pour ${listingTitle} expire le ${dateStr}, dans 10 jours. Renouvelle ton abonnement dès maintenant pour éviter toute interruption.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "10 days left before your subscription expires",
      subjectNamed: (firstName) => `${firstName}, 10 days left before your subscription expires`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Only 10 days left",
      body: (dateStr, listingTitle) => `Your Kabanalouer subscription for ${listingTitle} expires on ${dateStr}, in 10 days. Renew your subscription now to avoid any interruption.`,
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
      body: (dateStr, listingTitle) => `Ton abonnement Kabanalouer pour ${listingTitle} expire le ${dateStr}. Si rien ne change avant cette date, ton annonce disparaîtra des résultats de recherche. Renouvelle ton abonnement dès aujourd'hui pour l'éviter.`,
      buttonLabel: "Renouveler mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "Your subscription expires in 3 days",
      subjectNamed: (firstName) => `${firstName}, your subscription expires in 3 days`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Last reminder: 3 days left",
      body: (dateStr, listingTitle) => `Your Kabanalouer subscription for ${listingTitle} expires on ${dateStr}. If nothing changes before then, your listing will disappear from search results. Renew your subscription today to avoid that.`,
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

function formatPriceLabel(cents: number, lang: "fr" | "en"): string {
  const amount = (cents / 100).toLocaleString(lang === "en" ? "en-CA" : "fr-CA");
  return lang === "en" ? `$${amount}` : `${amount} $`;
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
  const template = TEMPLATES[threshold][preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const dateStr = formatExpiryDate(expiresAt, preferredLanguage);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(dateStr, listingTitle),
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
  body: (dateStr: string, listingTitle: string, priceLabel: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (dateStr) => `Ton abonnement Kabanalouer se renouvelle automatiquement le ${dateStr}`,
    subjectNamed: (firstName, dateStr) => `${firstName}, ton abonnement Kabanalouer se renouvelle automatiquement le ${dateStr}`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: (dateStr) => `Renouvellement automatique le ${dateStr}`,
    body: (dateStr, listingTitle, priceLabel) => `Ton abonnement annuel Kabanalouer pour ${listingTitle} (${priceLabel}) sera renouvelé automatiquement le ${dateStr} — tu n'as rien à faire. Si tu veux mettre à jour ta méthode de paiement ou annuler ton abonnement, tu peux le faire à tout moment.`,
    buttonLabel: "Gérer mon abonnement",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (dateStr) => `Your Kabanalouer subscription renews automatically on ${dateStr}`,
    subjectNamed: (firstName, dateStr) => `${firstName}, your Kabanalouer subscription renews automatically on ${dateStr}`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: (dateStr) => `Automatic renewal on ${dateStr}`,
    body: (dateStr, listingTitle, priceLabel) => `Your annual Kabanalouer subscription for ${listingTitle} (${priceLabel}) will renew automatically on ${dateStr} — no action needed on your part. If you'd like to update your payment method or cancel your subscription, you can do so anytime.`,
    buttonLabel: "Manage my subscription",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
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
  const template = AUTO_RENEWAL_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const dateStr = formatExpiryDate(expiresAt, preferredLanguage);
  const priceLabel = formatPriceLabel(priceCents, preferredLanguage);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading(dateStr),
    body: template.body(dateStr, listingTitle, priceLabel),
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

// ── Paiement échoué (abonnements payants, status = 'past_due') ──────────────
const PAYMENT_FAILED_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string, priceLabel: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Le paiement de ton abonnement Kabanalouer a échoué",
    subjectNamed: (firstName) => `${firstName}, le paiement de ton abonnement Kabanalouer a échoué`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ton paiement n'a pas pu être traité",
    body: (listingTitle, priceLabel) => `Le renouvellement automatique de ton abonnement annuel pour ${listingTitle} (${priceLabel}) n'a pas fonctionné — ta carte a probablement été refusée. Stripe va retenter automatiquement dans les prochains jours, mais tu peux aussi mettre à jour ta méthode de paiement dès maintenant pour éviter toute interruption.`,
    buttonLabel: "Mettre à jour mon paiement",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "Your Kabanalouer subscription payment failed",
    subjectNamed: (firstName) => `${firstName}, your Kabanalouer subscription payment failed`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your payment couldn't be processed",
    body: (listingTitle, priceLabel) => `The automatic renewal of your annual subscription for ${listingTitle} (${priceLabel}) didn't go through — your card was likely declined. Stripe will automatically retry over the next few days, but you can also update your payment method now to avoid any interruption.`,
    buttonLabel: "Update my payment method",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
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
  const template = PAYMENT_FAILED_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const priceLabel = formatPriceLabel(priceCents ?? 0, preferredLanguage);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, priceLabel),
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
