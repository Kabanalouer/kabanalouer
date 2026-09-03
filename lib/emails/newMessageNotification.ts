import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY!);

// no-reply, pas info@ — voir architecture Phase 2a : l'adresse de réponse
// dédiée (conv-xxx@reply...) n'existe pas encore, ce sera la Phase 2b.
const FROM = "Kabanalouer <no-reply@kabanalouer.ca>";

const PREVIEW_MAX_LENGTH = 150;

const TEMPLATE: Record<"fr" | "en", {
  subjectOne: (senderFirstName: string, listingTitle: string) => string;
  subjectMany: (count: number, senderFirstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  headingOne: (senderFirstName: string) => string;
  headingMany: (count: number, senderFirstName: string) => string;
  body: (listingTitle: string, preview: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectOne: (senderFirstName, listingTitle) => `Nouveau message de ${senderFirstName} à propos de ${listingTitle}`,
    subjectMany: (count, senderFirstName, listingTitle) => `${count} nouveaux messages de ${senderFirstName} à propos de ${listingTitle}`,
    greeting: (firstName) => `Bonjour ${firstName},`,
    headingOne: (senderFirstName) => `Nouveau message de ${senderFirstName}`,
    headingMany: (count, senderFirstName) => `${count} nouveaux messages de ${senderFirstName}`,
    body: (listingTitle, preview) => `À propos de : ${listingTitle}<br/><br/><em>"${preview}"</em>`,
    buttonLabel: "Voir la conversation",
    footerNote: "Ceci est un courriel automatique — réponds directement dans ta messagerie Kabanalouer.",
  },
  en: {
    subjectOne: (senderFirstName, listingTitle) => `New message from ${senderFirstName} about ${listingTitle}`,
    subjectMany: (count, senderFirstName, listingTitle) => `${count} new messages from ${senderFirstName} about ${listingTitle}`,
    greeting: (firstName) => `Hi ${firstName},`,
    headingOne: (senderFirstName) => `New message from ${senderFirstName}`,
    headingMany: (count, senderFirstName) => `${count} new messages from ${senderFirstName}`,
    body: (listingTitle, preview) => `About: ${listingTitle}<br/><br/><em>"${preview}"</em>`,
    buttonLabel: "View conversation",
    footerNote: "This is an automated email — reply directly in your Kabanalouer messaging.",
  },
};

export async function sendNewMessageNotificationEmail({
  email,
  preferredLanguage,
  recipientFirstName,
  senderFirstName,
  listingTitle,
  messageCount,
  previewText,
  listingId,
  otherUserId,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  recipientFirstName?: string | null;
  senderFirstName: string;
  listingTitle: string;
  messageCount: number;
  previewText: string;
  listingId: string;
  otherUserId: string;
}): Promise<{ error: Error | null }> {
  const template = TEMPLATE[preferredLanguage];
  const trimmedFirstName = recipientFirstName?.trim() || undefined;

  // senderFirstName/listingTitle/previewText viennent de données saisies par
  // les utilisateurs (nom de profil, titre d'annonce, contenu du message) —
  // jamais interpolées telles quelles dans le HTML (voir lib/escapeHtml.ts).
  const safeSender = escapeHtml(senderFirstName);
  const safeListingTitle = escapeHtml(listingTitle);
  // Le gabarit entoure déjà l'aperçu de guillemets (voir body() ci-dessus) —
  // si le message lui-même commence ou finit par un guillemet (tapé par
  // l'utilisateur, ex. "...texte"), on se retrouve avec deux guillemets
  // collés. On retire ceux en trop aux extrémités avant le gabarit.
  const trimmedQuotes = previewText.trim().replace(
    /^["'‘’“”«»]+|["'‘’“”«»]+$/g,
    ""
  );
  const truncated = trimmedQuotes.length > PREVIEW_MAX_LENGTH
    ? `${trimmedQuotes.slice(0, PREVIEW_MAX_LENGTH)}…`
    : trimmedQuotes;
  const safePreview = escapeHtml(truncated);

  const buttonPath = preferredLanguage === "en" ? "/en/messages" : "/messages";
  const buttonUrl = `${SITE_URL}${buttonPath}?listing=${listingId}&with=${otherUserId}`;

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(escapeHtml(trimmedFirstName)) : undefined,
    heading: messageCount > 1 ? template.headingMany(messageCount, safeSender) : template.headingOne(safeSender),
    body: template.body(safeListingTitle, safePreview),
    buttonLabel: template.buttonLabel,
    buttonUrl,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    // Sujet : texte brut, jamais rendu en HTML — pas besoin d'échappement ici.
    subject: messageCount > 1
      ? template.subjectMany(messageCount, senderFirstName, listingTitle)
      : template.subjectOne(senderFirstName, listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
