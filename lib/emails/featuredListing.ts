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
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} est activé`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} est activé`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce est activé !",
    body: (listingTitle, monthLabel, placement) =>
      `Félicitations ! Le boost de ${listingTitle} est maintenant actif pour ${monthLabel}. Ton annonce apparaît dès maintenant dans ${placement}, avec une visibilité accrue et une place prioritaire dans la sélection présentée aux voyageurs. Un petit rappel te sera envoyé avant son terme, pour que tu gardes le contrôle facilement.`,
    buttonLabel: "Voir mon annonce",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} is now active`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} is now active`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost is active!",
    body: (listingTitle, monthLabel, placement) =>
      `Congratulations! Your boost for ${listingTitle} is now active for ${monthLabel}. Your listing now appears in ${placement}, with extra visibility and a priority spot in what travelers see first. We'll send you a quick reminder before it ends, so you stay easily in control.`,
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
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} se termine dans 3 jours`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} se termine dans 3 jours`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce se termine dans 3 jours",
    body: (listingTitle, placement) =>
      `${listingTitle} bénéficie en ce moment d'un boost de visibilité dans ${placement}. Les annonces boostées reçoivent généralement beaucoup plus de visites que les annonces standards. Dans 3 jours, ton annonce redeviendra standard et perdra cette visibilité prioritaire. Renouvelle ton boost dès maintenant pour l'éviter.`,
    buttonLabel: "Renouveler mon boost",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} ends in 3 days`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} ends in 3 days`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost ends in 3 days",
    body: (listingTitle, placement) =>
      `${listingTitle} currently benefits from a visibility boost in ${placement}. Boosted listings generally get significantly more visits than standard listings. In 3 days, your listing will go back to standard and lose that priority visibility. Renew your boost now to avoid that.`,
    buttonLabel: "Renew my boost",
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
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} est maintenant terminé`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} est maintenant terminé`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce est terminé",
    body: (listingTitle, placement) =>
      `La période de boost de ${listingTitle} est terminée — ton annonce est repassée en affichage standard. Elle n'apparaît plus dans ${placement}. Réactive ton boost pour lui redonner cette visibilité prioritaire.`,
    buttonLabel: "Réactiver mon boost",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} has ended`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} has ended`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost has ended",
    body: (listingTitle, placement) =>
      `The boost period for ${listingTitle} has ended — your listing is back to standard display. It no longer appears in ${placement}. Reactivate your boost to give it back that priority visibility.`,
    buttonLabel: "Reactivate my boost",
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
