import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { getRegionSlugByDbValue } from "@/lib/regions";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type FeaturedType = "home" | "region";

const LINK_STYLE = "color:#636e40;text-decoration:underline;font-weight:600;";

function formatMonthLabel(month: string, lang: "fr" | "en"): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Le proprio peut acheter un boost jusqu'à MAX_MONTHS_AHEAD mois à l'avance (lib/featuredConfig.ts) —
// le texte de confirmation doit distinguer "actif dès maintenant" (mois en cours) de "confirmé pour plus tard" (mois futur).
function isMonthCurrent(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return month === currentMonth;
}

function homePageUrl(lang: "fr" | "en"): string {
  return lang === "en" ? `${SITE_URL}/en` : SITE_URL;
}

// Page publique /chalets/[slug] correspondant à la région — null si la région ne correspond
// à aucun slug connu (ne devrait pas arriver, mais on dégrade proprement en texte simple).
function regionPageUrl(region: string | null | undefined, lang: "fr" | "en"): string | null {
  if (!region) return null;
  const slug = getRegionSlugByDbValue(region);
  if (!slug) return null;
  return lang === "en" ? `${SITE_URL}/en/chalets/${slug}` : `${SITE_URL}/chalets/${slug}`;
}

// Phrase complète ("la section vedette de la région Laurentides"), avec un lien cliquable
// vers la page publique concernée (page d'accueil ou page région) intégré dans la phrase.
function placementLabel(type: FeaturedType, region: string | null | undefined, lang: "fr" | "en"): string {
  if (lang === "en") {
    if (type === "home") {
      return `the <a href="${homePageUrl(lang)}" style="${LINK_STYLE}">homepage's featured section</a>`;
    }
    const regionText = region ?? "";
    const url = regionPageUrl(region, lang);
    return url
      ? `the featured section for the <a href="${url}" style="${LINK_STYLE}">${regionText}</a> region`
      : `the featured section for the ${regionText} region`;
  }
  if (type === "home") {
    return `la section vedette de la <a href="${homePageUrl(lang)}" style="${LINK_STYLE}">page d'accueil</a>`;
  }
  const regionText = region ?? "";
  const url = regionPageUrl(region, lang);
  return url
    ? `la section vedette de la région <a href="${url}" style="${LINK_STYLE}">${regionText}</a>`
    : `la section vedette de la région ${regionText}`;
}

// Valeur affichée dans le champ "Page" du bloc de détails — texte simple, sans lien
// (le lien est déjà présent dans la phrase produite par placementLabel juste au-dessus).
function pageFieldLabel(type: FeaturedType, region: string | null | undefined, lang: "fr" | "en"): string {
  if (type === "home") return lang === "en" ? "Home page" : "Accueil";
  return region ?? "";
}

function detailsBlock(monthLabel: string, pageField: string, lang: "fr" | "en"): string {
  const monthWord = lang === "en" ? "Month" : "Mois";
  const pageWord = lang === "en" ? "Page" : "Page";
  return `<strong>${monthWord}</strong> : ${monthLabel}<br/><strong>${pageWord}</strong> : ${pageField}`;
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
  body: (listingTitle: string, monthLabel: string, placement: string, pageField: string, isCurrentMonth: boolean) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} est confirmé`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} est confirmé`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce est confirmé !",
    body: (listingTitle, monthLabel, placement, pageField, isCurrentMonth) =>
      `Félicitations ! Le boost de ${listingTitle} est maintenant confirmé.<br/><br/>${detailsBlock(monthLabel, pageField, "fr")}<br/><br/>` +
      (isCurrentMonth
        ? `Ton annonce apparaît dès maintenant dans ${placement}, avec une visibilité accrue et une place prioritaire dans la sélection présentée aux voyageurs.`
        : `Ton annonce apparaîtra dès le début de ${monthLabel} dans ${placement}, avec une visibilité accrue et une place prioritaire dans la sélection présentée aux voyageurs.`) +
      ` Un petit rappel te sera envoyé avant le terme de ton boost, pour que tu gardes le contrôle facilement.<br/><br/>Merci pour ta confiance 🙏`,
    buttonLabel: "Voir mon annonce",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} is confirmed`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} is confirmed`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost is confirmed!",
    body: (listingTitle, monthLabel, placement, pageField, isCurrentMonth) =>
      `Congratulations! Your boost for ${listingTitle} is now confirmed.<br/><br/>${detailsBlock(monthLabel, pageField, "en")}<br/><br/>` +
      (isCurrentMonth
        ? `Your listing now appears in ${placement}, with extra visibility and a priority spot in what travelers see first.`
        : `Your listing will appear in ${placement} starting at the beginning of ${monthLabel}, with extra visibility and a priority spot in what travelers see first.`) +
      ` We'll send you a quick reminder before it ends, so you stay easily in control.<br/><br/>Thanks for trusting us 🙏`,
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
  const pageField = pageFieldLabel(type, region, preferredLanguage);
  const currentMonth = isMonthCurrent(month);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, monthLabel, placement, pageField, currentMonth),
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
  body: (listingTitle: string, monthLabel: string, placement: string, pageField: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} se termine dans 3 jours`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} se termine dans 3 jours`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce se termine dans 3 jours",
    body: (listingTitle, monthLabel, placement, pageField) =>
      `${listingTitle} bénéficie en ce moment d'un boost de visibilité dans ${placement}.<br/><br/>${detailsBlock(monthLabel, pageField, "fr")}<br/><br/>Les annonces boostées reçoivent généralement beaucoup plus de visites que les annonces standards. Dans 3 jours, ton annonce redeviendra standard et perdra cette visibilité prioritaire. Renouvelle ton boost dès maintenant pour l'éviter.`,
    buttonLabel: "Renouveler mon boost",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} ends in 3 days`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} ends in 3 days`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost ends in 3 days",
    body: (listingTitle, monthLabel, placement, pageField) =>
      `${listingTitle} currently benefits from a visibility boost in ${placement}.<br/><br/>${detailsBlock(monthLabel, pageField, "en")}<br/><br/>Boosted listings generally get significantly more visits than standard listings. In 3 days, your listing will go back to standard and lose that priority visibility. Renew your boost now to avoid that.`,
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
  const template = EXPIRING_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const monthLabel = formatMonthLabel(month, preferredLanguage);
  const placement = placementLabel(type, region, preferredLanguage);
  const pageField = pageFieldLabel(type, region, preferredLanguage);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, monthLabel, placement, pageField),
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
  body: (listingTitle: string, monthLabel: string, placement: string, pageField: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Le boost de ton annonce ${listingTitle} est maintenant terminé`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, le boost de ton annonce ${listingTitle} est maintenant terminé`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Le boost de ton annonce est terminé",
    body: (listingTitle, monthLabel, placement, pageField) =>
      `La période de boost de ${listingTitle} est terminée — ton annonce est repassée en affichage standard.<br/><br/>${detailsBlock(monthLabel, pageField, "fr")}<br/><br/>Elle n'apparaît plus dans ${placement}. Réactive ton boost pour lui redonner cette visibilité prioritaire.`,
    buttonLabel: "Réactiver mon boost",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `Your ad boost for ${listingTitle} has ended`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, your ad boost for ${listingTitle} has ended`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your ad boost has ended",
    body: (listingTitle, monthLabel, placement, pageField) =>
      `The boost period for ${listingTitle} has ended — your listing is back to standard display.<br/><br/>${detailsBlock(monthLabel, pageField, "en")}<br/><br/>It no longer appears in ${placement}. Reactivate your boost to give it back that priority visibility.`,
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
  const template = EXPIRED_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const monthLabel = formatMonthLabel(month, preferredLanguage);
  const placement = placementLabel(type, region, preferredLanguage);
  const pageField = pageFieldLabel(type, region, preferredLanguage);

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle, monthLabel, placement, pageField),
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
