import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "Kabanalouer <no-reply@kabanalouer.ca>";

// Notification au voyageur quand le proprio répond à son avis — remplace le
// HTML inline auparavant codé en dur (FR seulement, non échappé) dans
// app/api/reviews/[id]/reply/route.ts.

const TEMPLATE: Record<"fr" | "en", {
  subject: (hostFirstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (hostFirstName: string, listingTitle: string, stars: string, comment: string | null, reply: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subject: (hostFirstName, listingTitle) => `${hostFirstName} a répondu à votre avis sur ${listingTitle}`,
    greeting: (firstName) => `Bonjour ${firstName},`,
    heading: "Le propriétaire vous a répondu",
    body: (hostFirstName, listingTitle, stars, comment, reply) =>
      `<strong>${hostFirstName}</strong> a répondu à votre avis sur <strong>${listingTitle}</strong>.<br><br>` +
      `<span style="color:#717171;font-size:14px;">Votre avis</span><br>` +
      `<span style="color:#222222;font-size:20px;letter-spacing:2px;">${stars}</span>` +
      (comment ? `<br><em>« ${comment} »</em>` : "") +
      `<br><br><span style="color:#717171;font-size:14px;">Réponse de ${hostFirstName}</span><br>${reply}`,
    buttonLabel: "Voir la fiche du chalet",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subject: (hostFirstName, listingTitle) => `${hostFirstName} replied to your review of ${listingTitle}`,
    greeting: (firstName) => `Hi ${firstName},`,
    heading: "The owner replied to you",
    body: (hostFirstName, listingTitle, stars, comment, reply) =>
      `<strong>${hostFirstName}</strong> replied to your review of <strong>${listingTitle}</strong>.<br><br>` +
      `<span style="color:#717171;font-size:14px;">Your review</span><br>` +
      `<span style="color:#222222;font-size:20px;letter-spacing:2px;">${stars}</span>` +
      (comment ? `<br><em>"${comment}"</em>` : "") +
      `<br><br><span style="color:#717171;font-size:14px;">${hostFirstName}'s reply</span><br>${reply}`,
    buttonLabel: "View the listing",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
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
  const template = TEMPLATE[preferredLanguage];
  const trimmedFirstName = travelerFirstName?.trim() || undefined;
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const listingPath = preferredLanguage === "en" ? `/en/cabins/${listingId}` : `/chalets/${listingId}`;

  // Prénoms, titre, commentaire et réponse viennent de données saisies par
  // les utilisateurs — jamais interpolés tels quels dans le HTML du courriel.
  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(escapeHtml(trimmedFirstName)) : undefined,
    heading: template.heading,
    body: template.body(
      escapeHtml(hostFirstName),
      escapeHtml(listingTitle),
      stars,
      comment ? escapeHtml(comment) : null,
      escapeHtml(reply).replace(/\n/g, "<br>")
    ),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${listingPath}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [travelerEmail],
    subject: template.subject(hostFirstName, listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
