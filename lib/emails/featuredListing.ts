import { SITE_URL } from "@/lib/siteUrl";
import { getRegionByDbValue } from "@/lib/regions";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";

// Séquence courriel des boosts (vedettes) : confirmation d'achat, rappel J-3,
// expiration. Textes modifiables dans Admin → Séquences courriel (TEMPLATE_*
// ci-dessous = textes par défaut, lib/emailTemplates).

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
  const regionConfig = getRegionByDbValue(region);
  if (!regionConfig) return null;
  return lang === "en" ? `${SITE_URL}/en/cabins/${regionConfig.slugEn}` : `${SITE_URL}/chalets/${regionConfig.slug}`;
}

// Nom de région affiché : valeur en base (FR) pour le français, nameEn pour l'anglais.
function regionDisplayName(region: string | null | undefined, lang: "fr" | "en"): string {
  if (!region) return "";
  if (lang !== "en") return region;
  return getRegionByDbValue(region)?.nameEn ?? region;
}

// Phrase complète ("la section vedette de la région Laurentides"), avec un lien cliquable
// vers la page publique concernée (page d'accueil ou page région) intégré dans la phrase.
// HTML : inséré tel quel dans le courriel (repère html).
function placementLabel(type: FeaturedType, region: string | null | undefined, lang: "fr" | "en"): string {
  if (lang === "en") {
    if (type === "home") {
      return `the <a href="${homePageUrl(lang)}" style="${LINK_STYLE}">homepage's featured section</a>`;
    }
    const regionText = escapeHtml(regionDisplayName(region, lang));
    const url = regionPageUrl(region, lang);
    return url
      ? `the featured section for the <a href="${url}" style="${LINK_STYLE}">${regionText}</a> region`
      : `the featured section for the ${regionText} region`;
  }
  if (type === "home") {
    return `la section vedette de la <a href="${homePageUrl(lang)}" style="${LINK_STYLE}">page d'accueil</a>`;
  }
  const regionText = escapeHtml(region ?? "");
  const url = regionPageUrl(region, lang);
  return url
    ? `la section vedette de la région <a href="${url}" style="${LINK_STYLE}">${regionText}</a>`
    : `la section vedette de la région ${regionText}`;
}

// Valeur affichée dans le champ "Page" du bloc de détails — texte simple, sans lien
// (le lien est déjà présent dans la phrase produite par placementLabel juste au-dessus).
function pageFieldLabel(type: FeaturedType, region: string | null | undefined, lang: "fr" | "en"): string {
  if (type === "home") return lang === "en" ? "Home page" : "Accueil";
  return regionDisplayName(region, lang);
}

function boostButtonPath(listingId: string, lang: "fr" | "en"): string {
  const base = `/dashboard/listings/${listingId}/edit?section=vedette`;
  return lang === "en" ? `/en${base}` : base;
}

// Objet sans prénom connu : « {prenom}, le boost… » devient « Le boost… ».
function subjectWithoutName(subject: string): string {
  const s = subject.replace(/^[\s,]+/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const FOOTER_QUESTION_FR = "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.";
const FOOTER_QUESTION_EN = "Got a question? Just reply to this email — we're happy to help.";

const PRENOM = { key: "prenom", label: "Prénom du proprio" };
const TITRE_CHALET = { key: "titreChalet", label: "Titre du chalet" };
const MOIS = { key: "mois", label: "Mois du boost (ex. « octobre 2026 »)" };
const PAGE = { key: "page", label: "Page du boost : « Accueil » ou le nom de la région" };
const EMPLACEMENT = {
  key: "emplacement",
  label: "Où l’annonce est mise en avant, avec un lien : « la section vedette de la page d’accueil » ou « la section vedette de la région Laurentides »",
  html: true,
};

type FeaturedEmailArgs = {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
  month: string;
};

async function sendFeaturedEmail(
  def: EmailTemplateDef,
  { email, preferredLanguage: lang, firstName, listingId, listingTitle, type, region, month }: FeaturedEmailArgs,
): Promise<{ error: Error | null }> {
  const name = firstName?.trim();
  const monthLabel = formatMonthLabel(month, lang);
  const placement = placementLabel(type, region, lang);

  // Confirmation : la phrase change selon que le boost commence maintenant ou un mois futur.
  const appearance = isMonthCurrent(month)
    ? lang === "en" ? `now appears in ${placement}` : `apparaît dès maintenant dans ${placement}`
    : lang === "en"
      ? `will appear in ${placement} starting at the beginning of ${escapeHtml(monthLabel)}`
      : `apparaîtra dès le début de ${escapeHtml(monthLabel)} dans ${placement}`;

  const text = await resolveEmailText(def, lang, {
    prenom: name,
    titreChalet: listingTitle,
    mois: monthLabel,
    page: pageFieldLabel(type, region, lang),
    emplacement: placement,
    apparition: appearance,
  });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${boostButtonPath(listingId, lang)}` });
  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: name ? text.subject : subjectWithoutName(text.subject),
    html,
  });
  return { error: error ? new Error(error.message) : null };
}

// ── Confirmation d'achat (déclenchée dans le webhook Stripe, checkout.session.completed) ──
export const TEMPLATE_FEATURED_CONFIRMATION: EmailTemplateDef = {
  id: "featured-confirmation",
  placeholders: [
    PRENOM,
    TITRE_CHALET,
    MOIS,
    PAGE,
    {
      key: "apparition",
      label: "Quand et où l’annonce apparaît, avec un lien : « apparaît dès maintenant dans la section vedette… » (boost du mois en cours) ou « apparaîtra dès le début de [mois] dans la section vedette… » (mois futur)",
      html: true,
    },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, le boost de ton annonce {titreChalet} est confirmé",
      greeting: "Bonjour {prenom} !",
      heading: "Le boost de ton annonce est confirmé !",
      body: "Félicitations ! Le boost de {titreChalet} est maintenant confirmé.\n\n**Mois** : {mois}\n**Page** : {page}\n\nTon annonce {apparition}, avec une visibilité accrue et une place prioritaire dans la sélection présentée aux voyageurs. Un petit rappel te sera envoyé avant le terme de ton boost, pour que tu gardes le contrôle facilement.\n\nMerci pour ta confiance 🙏",
      buttonLabel: "Voir mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your ad boost for {titreChalet} is confirmed",
      greeting: "Hi {prenom}!",
      heading: "Your ad boost is confirmed!",
      body: "Congratulations! Your boost for {titreChalet} is now confirmed.\n\n**Month** : {mois}\n**Page** : {page}\n\nYour listing {apparition}, with extra visibility and a priority spot in what travelers see first. We'll send you a quick reminder before it ends, so you stay easily in control.\n\nThanks for trusting us 🙏",
      buttonLabel: "View my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendFeaturedConfirmationEmail(args: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
  month: string;
}): Promise<{ error: Error | null }> {
  return sendFeaturedEmail(TEMPLATE_FEATURED_CONFIRMATION, args);
}

// ── Rappel J-3 (cron expire-featured) ────────────────────────────────────────
export const TEMPLATE_FEATURED_EXPIRING: EmailTemplateDef = {
  id: "featured-expiring",
  placeholders: [PRENOM, TITRE_CHALET, MOIS, PAGE, EMPLACEMENT],
  defaults: {
    fr: {
      subject: "{prenom}, le boost de ton annonce {titreChalet} se termine dans 3 jours",
      greeting: "Bonjour {prenom} !",
      heading: "Le boost de ton annonce se termine dans 3 jours",
      body: "{titreChalet} bénéficie en ce moment d'un boost de visibilité dans {emplacement}.\n\n**Mois** : {mois}\n**Page** : {page}\n\nLes annonces boostées reçoivent généralement beaucoup plus de visites que les annonces standards. Dans 3 jours, ton annonce redeviendra standard et perdra cette visibilité prioritaire. Renouvelle ton boost dès maintenant pour l'éviter.",
      buttonLabel: "Renouveler mon boost",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your ad boost for {titreChalet} ends in 3 days",
      greeting: "Hi {prenom}!",
      heading: "Your ad boost ends in 3 days",
      body: "{titreChalet} currently benefits from a visibility boost in {emplacement}.\n\n**Month** : {mois}\n**Page** : {page}\n\nBoosted listings generally get significantly more visits than standard listings. In 3 days, your listing will go back to standard and lose that priority visibility. Renew your boost now to avoid that.",
      buttonLabel: "Renew my boost",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendFeaturedExpiringEmail(args: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
  month: string;
}): Promise<{ error: Error | null }> {
  return sendFeaturedEmail(TEMPLATE_FEATURED_EXPIRING, args);
}

// ── Notification d'expiration, jour J (cron expire-featured) ────────────────
export const TEMPLATE_FEATURED_EXPIRED: EmailTemplateDef = {
  id: "featured-expired",
  placeholders: [PRENOM, TITRE_CHALET, MOIS, PAGE, EMPLACEMENT],
  defaults: {
    fr: {
      subject: "{prenom}, le boost de ton annonce {titreChalet} est maintenant terminé",
      greeting: "Bonjour {prenom} !",
      heading: "Le boost de ton annonce est terminé",
      body: "La période de boost de {titreChalet} est terminée — ton annonce est repassée en affichage standard.\n\n**Mois** : {mois}\n**Page** : {page}\n\nElle n'apparaît plus dans {emplacement}. Réactive ton boost pour lui redonner cette visibilité prioritaire.",
      buttonLabel: "Réactiver mon boost",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{prenom}, your ad boost for {titreChalet} has ended",
      greeting: "Hi {prenom}!",
      heading: "Your ad boost has ended",
      body: "The boost period for {titreChalet} has ended — your listing is back to standard display.\n\n**Month** : {mois}\n**Page** : {page}\n\nIt no longer appears in {emplacement}. Reactivate your boost to give it back that priority visibility.",
      buttonLabel: "Reactivate my boost",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendFeaturedExpiredEmail(args: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  type: FeaturedType;
  region?: string | null;
  month: string;
}): Promise<{ error: Error | null }> {
  return sendFeaturedEmail(TEMPLATE_FEATURED_EXPIRED, args);
}
