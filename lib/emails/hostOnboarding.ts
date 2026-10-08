import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { PRIX_VEDETTE_HOME, PRIX_VEDETTE_REGION } from "@/lib/featuredConfig";
import { formatLaunchOfferEnd, isLaunchOfferActive, REGULAR_PRICE_CENTS } from "@/lib/launchOffer";
import { formatPriceLabel } from "@/lib/subscriptionPricing";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Courriels d'accueil des proprios, envoyés par le cron host-onboarding-emails :
// - 48 h après la création d'un brouillon jamais publié : rappel de le compléter
// Après la première publication :
// - 48 h : invitation à booster l'annonce (vedette région / accueil)
// - 96 h : invitation à recevoir les demandes et messages par texto
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).

const FROM = "Kabanalouer <info@kabanalouer.ca>";

type Lang = "fr" | "en";

const step = (n: number, html: string) =>
  `<tr><td style="vertical-align:top;padding:0 10px 10px 0;"><span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:9999px;background-color:#e8ebdc;color:#636e40;font-size:12px;font-weight:700;text-align:center;">${n}</span></td><td style="padding:0 0 10px 0;font-size:16px;line-height:1.5;color:#484848;">${html}</td></tr>`;

const steps = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px 0;">${items.map((s, i) => step(i + 1, s)).join("")}</table>`;

const FOOTER_QUESTION_FR = "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.";
const FOOTER_QUESTION_EN = "Got a question? Just reply to this email — we’re happy to help.";

export const TEMPLATE_BOOST_INVITE: EmailTemplateDef = {
  id: "boost-invite",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "prixVedetteRegion", label: "Prix de la vedette région (nombre seulement)" },
    { key: "prixVedetteAccueil", label: "Prix de la vedette page d’accueil (nombre seulement)" },
  ],
  defaults: {
    fr: {
      subject: "Fais voir {titreChalet} à plus de voyageurs",
      greeting: "Bonjour {prenom} !",
      heading: "Donne un coup de pouce à ton chalet",
      body: "{titreChalet} est en ligne depuis quelques jours — bravo !\n\nPour être vu par plus de voyageurs, tu peux le mettre en vedette : en tête de sa page région ({prixVedetteRegion} $/mois) ou sur la page d’accueil de Kabanalouer ({prixVedetteAccueil} $/mois). Les places sont limitées chaque mois.",
      buttonLabel: "Booster mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "Get {titreChalet} seen by more travelers",
      greeting: "Hi {prenom}!",
      heading: "Give your cabin a boost",
      body: "{titreChalet} has been live for a few days — congratulations!\n\nTo reach more travelers, you can feature it: at the top of its region page (${prixVedetteRegion}/month) or on the Kabanalouer home page (${prixVedetteAccueil}/month). Spots are limited each month.",
      buttonLabel: "Boost my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendBoostInviteEmail({
  email, lang, firstName, listingTitle, listingId,
}: {
  email: string; lang: Lang; firstName?: string | null; listingTitle: string; listingId: string;
}): Promise<{ error: Error | null }> {
  const path = `${lang === "en" ? "/en" : ""}/dashboard/listings/${listingId}/edit?section=vedette`;
  const text = await resolveEmailText(TEMPLATE_BOOST_INVITE, lang, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
    prixVedetteRegion: String(PRIX_VEDETTE_REGION),
    prixVedetteAccueil: String(PRIX_VEDETTE_HOME),
  });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${path}` });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

export const TEMPLATE_SMS_INVITE: EmailTemplateDef = {
  id: "sms-invite",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "etapes", label: "Les 3 étapes numérotées pour activer les textos", html: true },
  ],
  defaults: {
    fr: {
      subject: "Reçois tes demandes de prix par texto",
      greeting: "Bonjour {prenom} !",
      heading: "Reçois tes demandes par texto",
      body: "Un voyageur qui attend une réponse va souvent voir ailleurs. Répondre en moins de 24 h aide aussi ton annonce à mieux se classer.\n\nReçois un texto pour chaque nouvelle demande de prix ou nouveau message, avec un lien pour répondre tout de suite. Rien à installer.{etapes}",
      buttonLabel: "Activer les textos",
      footerNote: "Tu continues de recevoir les courriels aussi. Tu peux régler les deux dans ton profil.",
    },
    en: {
      subject: "Get your price requests by text",
      greeting: "Hi {prenom}!",
      heading: "Get your requests by text",
      body: "A traveler waiting for an answer often looks elsewhere. Replying within 24 hours also helps your listing rank higher.\n\nGet a text for every new price request or message, with a link to reply right away. Nothing to install.{etapes}",
      buttonLabel: "Turn on text messages",
      footerNote: "You’ll keep getting emails too. You can adjust both in your profile.",
    },
  },
};

export async function sendSmsInviteEmail({
  email, lang, firstName,
}: {
  email: string; lang: Lang; firstName?: string | null;
}): Promise<{ error: Error | null }> {
  const fr = lang === "fr";
  const profilePath = `${fr ? "" : "/en"}/dashboard/profile#phone`;

  const howTo = fr
    ? steps([
        "Ouvre ton profil avec le bouton ci-dessous.",
        "Dans <strong>Notifications</strong>, active <strong>«&nbsp;Par texto&nbsp;»</strong>.",
        "Entre ton numéro de cellulaire. C’est tout&nbsp;!",
      ])
    : steps([
        "Open your profile with the button below.",
        "Under <strong>Notifications</strong>, turn on <strong>“By text message”</strong>.",
        "Enter your cell phone number. That’s it!",
      ]);

  const text = await resolveEmailText(TEMPLATE_SMS_INVITE, lang, { prenom: firstName?.trim(), etapes: howTo });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${profilePath}` });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

export const TEMPLATE_DRAFT_REMINDER: EmailTemplateDef = {
  id: "draft-reminder",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet (vide si l’annonce n’a pas encore de titre)" },
    { key: "titreOuTonChalet", label: "Titre du chalet, ou « Ton chalet » s’il n’a pas de titre" },
    { key: "offreLancement", label: "Phrase de l’offre de lancement avec la date en gras (ou le prix annuel après l’offre)", html: true },
  ],
  defaults: {
    fr: {
      subject: "{titreOuTonChalet} est presque en ligne",
      greeting: "Bonjour {prenom} !",
      heading: "Ton chalet est presque en ligne",
      body: "Ton annonce **{titreChalet}** est commencée, mais pas encore publiée. Il ne reste que quelques informations à compléter avant que les voyageurs puissent la voir.\n\nUne fois tout rempli, clique sur « Publier mon annonce ».\n\n{offreLancement}",
      buttonLabel: "Compléter mon annonce",
      footerNote: FOOTER_QUESTION_FR,
    },
    en: {
      subject: "{titreOuTonChalet} is almost online",
      greeting: "Hi {prenom}!",
      heading: "Your cabin is almost online",
      body: "Your listing **{titreChalet}** is started but not published yet. Just a few details are left before travelers can see it.\n\nOnce everything is filled in, click “Publish my listing”.\n\n{offreLancement}",
      buttonLabel: "Complete my listing",
      footerNote: FOOTER_QUESTION_EN,
    },
  },
};

export async function sendDraftReminderEmail({
  email, lang, firstName, listingTitle, listingId,
}: {
  email: string; lang: Lang; firstName?: string | null; listingTitle: string | null; listingId: string;
}): Promise<{ error: Error | null }> {
  const fr = lang === "fr";
  const title = listingTitle?.trim() ?? "";
  const path = `${fr ? "" : "/en"}/dashboard/listings/${listingId}/edit`;

  // Offre de lancement (lib/launchOffer.ts) : gratuité + date limite ; sinon prix annuel.
  const offerEnd = isLaunchOfferActive() ? formatLaunchOfferEnd(lang) : null;
  const regularPrice = formatPriceLabel(REGULAR_PRICE_CENTS, lang);
  const pricing = fr
    ? offerEnd
      ? `C’est gratuit la première année pour toute annonce publiée d’ici le <strong>${escapeHtml(offerEnd)}</strong>.`
      : `L’abonnement est de ${regularPrice} par année, sans aucune commission sur tes réservations.`
    : offerEnd
      ? `It’s free for the first year for any listing published by <strong>${escapeHtml(offerEnd)}</strong>.`
      : `The subscription is ${regularPrice} per year, with no commission on your bookings.`;

  const text = await resolveEmailText(TEMPLATE_DRAFT_REMINDER, lang, {
    prenom: firstName?.trim(),
    titreChalet: title,
    titreOuTonChalet: title || (fr ? "Ton chalet" : "Your cabin"),
    offreLancement: pricing,
  });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${path}` });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}
