import { SITE_URL } from "@/lib/siteUrl";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";

const FROM = "Kabanalouer <info@kabanalouer.ca>";

// Notification au proprio à la réception d'un nouvel avis (échange ou
// séjour) — remplace le HTML inline auparavant codé en dur dans
// app/api/reviews/route.ts (route retirée avec l'ancien flux manuel).
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_REVIEW_RECEIVED
// = textes par défaut, lib/emailTemplates).

export const TEMPLATE_REVIEW_RECEIVED: EmailTemplateDef = {
  id: "review-received",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "prenomVoyageur", label: "Prénom du voyageur qui a laissé l’avis" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "note", label: "Note en étoiles (ex. ★★★★☆ 4/5)", html: true },
    { key: "commentaire", label: "Commentaire du voyageur, en italique entre guillemets (vide s’il n’a rien écrit)", html: true },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, vous avez reçu un nouvel avis sur {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "Nouvel avis reçu",
      body: "**{prenomVoyageur}** a laissé un avis sur **{titreChalet}**.\n\n{note}\n\n{commentaire}",
      buttonLabel: "Voir l'avis et répondre",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subject: "{prenom}, you received a new review on {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "New review received",
      body: "**{prenomVoyageur}** left a review on **{titreChalet}**.\n\n{note}\n\n{commentaire}",
      buttonLabel: "View and reply",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
};

// Objet sans prénom connu : « {prenom}, vous avez… » devient « Vous avez… ».
function subjectWithoutName(subject: string): string {
  const s = subject.replace(/^[\s,]+/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function sendReviewReceivedEmail({
  hostEmail,
  hostFirstName,
  preferredLanguage,
  listingTitle,
  reviewerFirstName,
  rating,
  comment,
}: {
  hostEmail: string;
  hostFirstName?: string | null;
  preferredLanguage: "fr" | "en";
  listingTitle: string;
  reviewerFirstName: string;
  rating: number;
  comment: string | null;
}): Promise<{ error: Error | null }> {
  const lang = preferredLanguage;
  const name = hostFirstName?.trim();
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const buttonPath = lang === "en" ? "/en/dashboard/avis" : "/dashboard/avis";

  // Blocs HTML construits ici : le commentaire est saisi par le voyageur,
  // donc échappé. Prénoms et titre sont échappés par resolveEmailText.
  const ratingHtml = `<span style="color:#222222;font-size:20px;letter-spacing:2px;">${stars}</span> <span style="color:#717171;font-size:14px;">${rating}/5</span>`;
  const commentHtml = comment
    ? lang === "en"
      ? `<em>"${escapeHtml(comment)}"</em>`
      : `<em>« ${escapeHtml(comment)} »</em>`
    : "";

  const text = await resolveEmailText(TEMPLATE_REVIEW_RECEIVED, lang, {
    prenom: name,
    prenomVoyageur: reviewerFirstName,
    titreChalet: listingTitle,
    note: ratingHtml,
    commentaire: commentHtml,
  });
  const html = renderEmail({ lang, ...text, buttonUrl: `${SITE_URL}${buttonPath}` });
  const { error } = await sendEmail({
    from: FROM,
    to: [hostEmail],
    subject: name ? text.subject : subjectWithoutName(text.subject),
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
