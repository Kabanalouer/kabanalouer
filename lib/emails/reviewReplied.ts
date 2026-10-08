import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_REVIEW_REPLIED
// ci-dessous = textes par défaut, lib/emailTemplates).

const FROM = "Kabanalouer <no-reply@kabanalouer.ca>";

// Notification au voyageur quand le proprio répond à son avis — remplace le
// HTML inline auparavant codé en dur (FR seulement, non échappé) dans
// app/api/reviews/[id]/reply/route.ts.

export const TEMPLATE_REVIEW_REPLIED: EmailTemplateDef = {
  id: "review-replied",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "prenomProprio", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "avis", label: "Bloc « Votre avis » : étoiles et commentaire du voyageur (commence par un saut de paragraphe)", html: true },
    { key: "reponse", label: "Bloc « Réponse de… » : la réponse du proprio (commence par un saut de paragraphe)", html: true },
  ],
  defaults: {
    fr: {
      subject: "{prenomProprio} a répondu à votre avis sur {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "Le propriétaire vous a répondu",
      body: "**{prenomProprio}** a répondu à votre avis sur **{titreChalet}**.{avis}{reponse}",
      buttonLabel: "Voir la fiche du chalet",
      footerNote: "Une question\u202f? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subject: "{prenomProprio} replied to your review of {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "The owner replied to you",
      body: "**{prenomProprio}** replied to your review of **{titreChalet}**.{avis}{reponse}",
      buttonLabel: "View the listing",
      footerNote: "Got a question? Just reply to this email \u2014 we're happy to help.",
    },
  },
};

export async function sendReviewRepliedEmail({
  travelerEmail,
  travelerFirstName,
  preferredLanguage,
  hostFirstName,
  listingId,
  listingTitle,
  rating,
  comment,
  reply,
}: {
  travelerEmail: string;
  travelerFirstName?: string | null;
  preferredLanguage: "fr" | "en";
  hostFirstName: string;
  listingId: string;
  listingTitle: string;
  rating: number;
  comment: string | null;
  reply: string;
}): Promise<{ error: Error | null }> {
  const fr = preferredLanguage === "fr";
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const listingPath = fr ? `/chalets/${listingId}` : `/en/cabins/${listingId}`;

  // Prénoms, titre, commentaire et réponse viennent de données saisies par
  // les utilisateurs — jamais interpolés tels quels dans le HTML du courriel
  // (prénoms et titre échappés par resolveEmailText, blocs ci-dessous ici).
  const label = (text: string) => `<span style="color:#717171;font-size:14px;">${text}</span>`;
  const safeComment = comment ? escapeHtml(comment) : null;
  const reviewBlock =
    `<br><br>${label(fr ? "Votre avis" : "Your review")}<br>` +
    `<span style="color:#222222;font-size:20px;letter-spacing:2px;">${stars}</span>` +
    (safeComment ? (fr ? `<br><em>«\u00a0${safeComment}\u00a0»</em>` : `<br><em>"${safeComment}"</em>`) : "");
  const safeHost = escapeHtml(hostFirstName);
  const replyBlock =
    `<br><br>${label(fr ? `Réponse de ${safeHost}` : `${safeHost}'s reply`)}<br>` +
    escapeHtml(reply).replace(/\n/g, "<br>");

  const text = await resolveEmailText(TEMPLATE_REVIEW_REPLIED, preferredLanguage, {
    prenom: travelerFirstName?.trim(),
    prenomProprio: hostFirstName,
    titreChalet: listingTitle,
    avis: reviewBlock,
    reponse: replyBlock,
  });
  const html = renderEmail({ lang: preferredLanguage, ...text, buttonUrl: `${SITE_URL}${listingPath}` });

  const { error } = await sendEmail({ from: FROM, to: [travelerEmail], subject: text.subject, html });

  return { error: error ? new Error(error.message) : null };
}
