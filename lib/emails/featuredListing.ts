import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type FeaturedType = "home" | "region";

function formatMonthLabel(month: string, lang: "fr" | "en"): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function placementLabel(type: FeaturedType, region: string | null | undefined, lang: "fr" | "en"): string {
  if (lang === "en") {
    return type === "home" ? "the homepage's featured section" : `the featured section for the ${region ?? ""} region`;
  }
  return type === "home" ? "la section vedette de la page d'accueil" : `la section vedette de la région ${region ?? ""}`;
}

function boostButtonPath(listingId: string, lang: "fr" | "en"): string {
  const base = `/dashboard/listings/${listingId}/edit?section=vedette`;
  return lang === "en" ? `/en${base}` : base;
}

// ── Confirmation d'achat (déclenchée dans le webhook Stripe, checkout.session.completed) ──
const CONFIRMATION_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: (listingTitle: string) => string;
  subjectNamed: (firstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string, monthLabel: string, placement: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Ta vedette pour ${listingTitle} est activée`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, ta vedette pour ${listingTitle} est activée`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ta vedette est activée !",
    body: (listingTitle, monthLabel, placement) =>
      `Félicitations ! Ta vedette pour ${listingTitle} est maintenant active pour ${monthLabel}. Ton annonce apparaît dès maintenant dans ${placement}, avec une visibilité accrue et une place prioritaire dans la sélection présentée aux voyageurs. Ta vedette couvre le mois en cours — un petit rappel te sera envoyé avant son terme, pour que tu gardes le contrôle facilement.`,
    buttonLabel: "Voir mon annonce",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your featured spot for ${listingTitle} is now active`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your featured spot for ${listingTitle} is now active`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your featured spot is active!",
    body: (listingTitle, monthLabel, placement) =>
      `Congratulations! Your featured spot for ${listingTitle} is now active for ${monthLabel}. Your listing now appears in ${placement}, with extra visibility and a priority spot in what travelers see first. Your featured spot covers the current month — we'll send you a quick reminder before it ends, so you stay easily in control.`,
    buttonLabel: "View my listing",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendFeaturedConfirmationEmail({
  email,
  preferredLanguage,
  firstName,
  listingId,
  listingTitle,
  type,
  region,
  month,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
  month: string;
}): Promise<{ error: Error | null }> {
  const template = CONFIRMATION_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const monthLabel = formatMonthLabel(month, preferredLanguage);
  const placement = placementLabel(type, region, preferredLanguage);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, monthLabel, placement),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${boostButtonPath(listingId, preferredLanguage)}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName, listingTitle) : template.subjectGeneric(listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}

// ── Rappel J-3 (cron expire-featured) ────────────────────────────────────────
const EXPIRING_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: (listingTitle: string) => string;
  subjectNamed: (firstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string, placement: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Ta vedette ${listingTitle} se termine dans 3 jours`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, ta vedette ${listingTitle} se termine dans 3 jours`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ta vedette se termine dans 3 jours",
    body: (listingTitle, placement) =>
      `${listingTitle} bénéficie en ce moment d'une visibilité vedette dans ${placement}. Les annonces vedettes reçoivent généralement beaucoup plus de visites que les annonces standards. Dans 3 jours, ton annonce redeviendra standard et perdra cette visibilité prioritaire. Renouvelle ta vedette dès maintenant pour l'éviter.`,
    buttonLabel: "Renouveler ma vedette",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your featured spot for ${listingTitle} ends in 3 days`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your featured spot for ${listingTitle} ends in 3 days`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your featured spot ends in 3 days",
    body: (listingTitle, placement) =>
      `${listingTitle} currently benefits from featured visibility in ${placement}. Featured listings generally get significantly more visits than standard listings. In 3 days, your listing will go back to standard and lose that priority visibility. Renew your featured spot now to avoid that.`,
    buttonLabel: "Renew my featured spot",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendFeaturedExpiringEmail({
  email,
  preferredLanguage,
  firstName,
  listingId,
  listingTitle,
  type,
  region,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
}): Promise<{ error: Error | null }> {
  const template = EXPIRING_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const placement = placementLabel(type, region, preferredLanguage);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, placement),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${boostButtonPath(listingId, preferredLanguage)}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName, listingTitle) : template.subjectGeneric(listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}

// ── Notification d'expiration, jour J (cron expire-featured) ────────────────
const EXPIRED_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: (listingTitle: string) => string;
  subjectNamed: (firstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string, placement: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Ta vedette ${listingTitle} est maintenant terminée`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, ta vedette ${listingTitle} est maintenant terminée`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ta vedette est maintenant terminée",
    body: (listingTitle, placement) =>
      `La période vedette de ${listingTitle} est terminée — ton annonce est repassée en affichage standard. Elle n'apparaît plus dans ${placement}. Réactive ta vedette pour lui redonner cette visibilité prioritaire.`,
    buttonLabel: "Réactiver ma vedette",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your featured spot for ${listingTitle} has ended`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your featured spot for ${listingTitle} has ended`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your featured spot has ended",
    body: (listingTitle, placement) =>
      `The featured period for ${listingTitle} has ended — your listing is back to standard display. It no longer appears in ${placement}. Reactivate your featured spot to give it back that priority visibility.`,
    buttonLabel: "Reactivate my featured spot",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendFeaturedExpiredEmail({
  email,
  preferredLanguage,
  firstName,
  listingId,
  listingTitle,
  type,
  region,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
}): Promise<{ error: Error | null }> {
  const template = EXPIRED_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const placement = placementLabel(type, region, preferredLanguage);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, placement),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${boostButtonPath(listingId, preferredLanguage)}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName, listingTitle) : template.subjectGeneric(listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
