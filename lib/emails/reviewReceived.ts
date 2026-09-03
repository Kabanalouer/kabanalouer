import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "Kabanalouer <info@kabanalouer.ca>";

// Notification au proprio à la réception d'un nouvel avis (échange ou
// séjour) — remplace le HTML inline auparavant codé en dur dans
// app/api/reviews/route.ts (route retirée avec l'ancien flux manuel).

const TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: (listingTitle: string) => string;
  subjectNamed: (firstName: string, listingTitle: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (reviewerFirstName: string, listingTitle: string, stars: string, rating: number, comment: string | null) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: (listingTitle) => `Vous avez reçu un nouvel avis sur ${listingTitle}`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, vous avez reçu un nouvel avis sur ${listingTitle}`,
    greeting: (firstName) => `Bonjour ${firstName},`,
    heading: "Nouvel avis reçu",
    body: (reviewerFirstName, listingTitle, stars, rating, comment) =>
      `<strong>${reviewerFirstName}</strong> a laissé un avis sur <strong>${listingTitle}</strong>.<br><br>` +
      `<span style="color:#636e40;font-size:20px;letter-spacing:2px;">${stars}</span> <span style="color:#a8a29e;font-size:13px;">${rating}/5</span>` +
      (comment ? `<br><br><em>"${comment}"</em>` : ""),
    buttonLabel: "Voir l'avis et répondre",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: (listingTitle) => `You received a new review on ${listingTitle}`,
    subjectNamed: (firstName, listingTitle) => `${firstName}, you received a new review on ${listingTitle}`,
    greeting: (firstName) => `Hi ${firstName},`,
    heading: "New review received",
    body: (reviewerFirstName, listingTitle, stars, rating, comment) =>
      `<strong>${reviewerFirstName}</strong> left a review on <strong>${listingTitle}</strong>.<br><br>` +
      `<span style="color:#636e40;font-size:20px;letter-spacing:2px;">${stars}</span> <span style="color:#a8a29e;font-size:13px;">${rating}/5</span>` +
      (comment ? `<br><br><em>"${comment}"</em>` : ""),
    buttonLabel: "View and reply",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

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
  const template = TEMPLATE[preferredLanguage];
  const trimmedFirstName = hostFirstName?.trim() || undefined;
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/avis" : "/dashboard/avis";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(reviewerFirstName, listingTitle, stars, rating, comment),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${buttonPath}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [hostEmail],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName, listingTitle) : template.subjectGeneric(listingTitle),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
