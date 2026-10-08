import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { buildReplyToAddress, getOrCreateEmailReplyAddress } from "@/lib/emailReplyAddress";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).

// messages@ (pas no-reply@, contrairement aux autres courriels du projet) —
// moins dissuasif pour la réponse, maintenant que la Phase 2b permet
// réellement de répondre via le Reply-To (conv-{token}@reply.kabanalouer.ca).
const FROM = "Kabanalouer <messages@kabanalouer.ca>";

type AdminClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const FOOTER_REPLY_FR = "Vous pouvez répondre à ce message en répondant à cet email (reply) ou directement dans la messagerie de Kabanalouer en cliquant sur le bouton ci-dessus.";
const FOOTER_REPLY_EN = "You can reply to this message by replying to this email, or directly in your Kabanalouer messaging by clicking the button above.";

const PLACEHOLDERS: EmailTemplateDef["placeholders"] = [
  { key: "prenom", label: "Prénom du destinataire" },
  { key: "prenomExpediteur", label: "Prénom de la personne qui a écrit le message" },
  { key: "titreChalet", label: "Titre du chalet" },
  { key: "nouveauxMessages", label: "« Nouveau message » ou « 3 nouveaux messages » selon le nombre (début de phrase, en anglais « New message » / « 3 new messages »)" },
  { key: "message", label: "Le message, en italique entre guillemets", html: true },
  { key: "noteTraduction", label: "Petite mention « Traduit automatiquement… » si le message a été traduit (vide sinon)", html: true },
];

// Deux versions selon le destinataire : proprio (incitation à répondre vite
// dans le pied de courriel) ou voyageur.
export const TEMPLATE_NEW_MESSAGE_HOST: EmailTemplateDef = {
  id: "new-message-host",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{nouveauxMessages} de {prenomExpediteur} à propos de {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "{nouveauxMessages} de {prenomExpediteur}",
      body: "À propos de\u00a0: {titreChalet}\n\n{message}{noteTraduction}",
      buttonLabel: "Répondre",
      footerNote: `${FOOTER_REPLY_FR}\n\n**Répondre en moins de 24\u00a0h permet à votre annonce d\u2019être affichée plus haut dans les résultats de recherche.**`,
    },
    en: {
      subject: "{nouveauxMessages} from {prenomExpediteur} about {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "{nouveauxMessages} from {prenomExpediteur}",
      body: "About: {titreChalet}\n\n{message}{noteTraduction}",
      buttonLabel: "Reply",
      footerNote: `${FOOTER_REPLY_EN}\n\n**Replying within 24 hours helps your listing show up higher in search results.**`,
    },
  },
};

export const TEMPLATE_NEW_MESSAGE_TRAVELER: EmailTemplateDef = {
  id: "new-message-traveler",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: { ...TEMPLATE_NEW_MESSAGE_HOST.defaults.fr, footerNote: FOOTER_REPLY_FR },
    en: { ...TEMPLATE_NEW_MESSAGE_HOST.defaults.en, footerNote: FOOTER_REPLY_EN },
  },
};

export async function sendNewMessageNotificationEmail(
  admin: AdminClient,
  {
    email,
    preferredLanguage,
    recipientFirstName,
    recipientId,
    senderFirstName,
    listingTitle,
    messageCount,
    previewText,
    previewTranslated = false,
    recipientIsHost = false,
    listingId,
    otherUserId,
  }: {
    email: string;
    preferredLanguage: "fr" | "en";
    recipientFirstName?: string | null;
    recipientId: string;
    senderFirstName: string;
    listingTitle: string;
    messageCount: number;
    previewText: string;
    previewTranslated?: boolean;
    // Destinataire = proprio de l'annonce (jamais pour un voyageur) :
    // incitation à répondre rapidement dans le pied de courriel
    recipientIsHost?: boolean;
    listingId: string;
    otherUserId: string;
  }
): Promise<{ error: Error | null }> {
  const fr = preferredLanguage === "fr";

  // senderFirstName/listingTitle/previewText viennent de données saisies par
  // les utilisateurs (nom de profil, titre d'annonce, contenu du message) —
  // jamais interpolées telles quelles dans le HTML : prénoms et titre sont
  // échappés par resolveEmailText, le message ci-dessous (lib/escapeHtml.ts).
  // Le bloc du message entoure déjà le texte de guillemets —
  // si le message lui-même commence ou finit par un guillemet (tapé par
  // l'utilisateur, ex. "...texte"), on se retrouve avec deux guillemets
  // collés. On retire ceux en trop aux extrémités avant le gabarit.
  const trimmedQuotes = previewText.trim().replace(
    /^["'‘’“”«»]+|["'‘’“”«»]+$/g,
    ""
  );
  // Message complet (plus de troncature à 150 caractères) — sauts de ligne
  // préservés en <br/>, même pattern que lib/emails/contactMessageNotification.ts.
  const safePreview = escapeHtml(trimmedQuotes).replace(/\n/g, "<br/>");
  const messageBlock = fr ? `<em>«\u00a0${safePreview}\u00a0»</em>` : `<em>"${safePreview}"</em>`;
  const translatedNote = previewTranslated
    ? `<p style="margin:8px 0 0;font-size:12px;color:#9a9a9a;">${preferredLanguage === "en" ? "Automatically translated from French" : "Traduit automatiquement de l’anglais"}</p>`
    : "";

  const buttonPath = preferredLanguage === "en" ? "/en/messages" : "/messages";
  const buttonUrl = `${SITE_URL}${buttonPath}?listing=${listingId}&with=${otherUserId}`;

  // Reply-To dédié (Phase 2b) — permet de répondre directement depuis
  // Gmail/Outlook sans se connecter à l'app. Un échec ici ne doit jamais
  // bloquer l'envoi de la notification elle-même (juste sans Reply-To).
  const replyAddress = await getOrCreateEmailReplyAddress(admin, {
    listingId,
    userAId: recipientId,
    userBId: otherUserId,
  });
  const replyTo = "token" in replyAddress ? buildReplyToAddress(replyAddress.token) : undefined;
  if (!replyTo) {
    console.error("sendNewMessageNotificationEmail: pas de Reply-To (listing", listingId, ")", replyAddress);
  }

  // « Nouveau message » / « 3 nouveaux messages » (début de phrase).
  const newMessages = messageCount > 1
    ? (fr ? `${messageCount} nouveaux messages` : `${messageCount} new messages`)
    : (fr ? "Nouveau message" : "New message");

  const text = await resolveEmailText(
    recipientIsHost ? TEMPLATE_NEW_MESSAGE_HOST : TEMPLATE_NEW_MESSAGE_TRAVELER,
    preferredLanguage,
    {
      prenom: recipientFirstName?.trim(),
      prenomExpediteur: senderFirstName,
      titreChalet: listingTitle,
      nouveauxMessages: newMessages,
      message: messageBlock,
      noteTraduction: translatedNote,
    }
  );
  const html = renderEmail({ lang: preferredLanguage, ...text, buttonUrl });

  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html, replyTo });

  return { error: error ? new Error(error.message) : null };
}
