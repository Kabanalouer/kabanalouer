// Courriel de bienvenue envoyé au propriétaire quand un admin publie une
// annonce importée en son nom (voir app/api/admin/listings/[id]/publish).
// Distinct de welcomeSubscription.ts, qui invite à compléter/publier — ici,
// l'annonce est déjà en ligne, le lien pointe directement vers la fiche
// publique.
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const TEMPLATES: Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  bodyFree: (listingTitle: string) => string;
  bodyPaid: (listingTitle: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Ton annonce Kabanalouer est en ligne !",
    subjectNamed: (firstName) => `${firstName}, ton annonce Kabanalouer est en ligne !`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ton annonce est en ligne !",
    bodyFree: (listingTitle) =>
      `Bonne nouvelle : ${listingTitle} est maintenant publiée sur Kabanalouer, et ta première année d'accès est gratuite. Les voyageurs peuvent dès maintenant te contacter directement.`,
    bodyPaid: (listingTitle) =>
      `Bonne nouvelle : ${listingTitle} est maintenant publiée sur Kabanalouer. Les voyageurs peuvent dès maintenant te contacter directement.`,
    buttonLabel: "Voir mon annonce",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "Your Kabanalouer listing is live!",
    subjectNamed: (firstName) => `${firstName}, your Kabanalouer listing is live!`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your listing is live!",
    bodyFree: (listingTitle) =>
      `Good news: ${listingTitle} is now published on Kabanalouer, and your first year of access is free. Travelers can now contact you directly.`,
    bodyPaid: (listingTitle) =>
      `Good news: ${listingTitle} is now published on Kabanalouer. Travelers can now contact you directly.`,
    buttonLabel: "View my listing",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendImportPublishedEmail({
  email,
  preferredLanguage,
  firstName,
  listingId,
  listingTitle,
  isFreeLaunch,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingId: string;
  listingTitle: string;
  isFreeLaunch: boolean;
}): Promise<{ error: Error | null }> {
  const template = TEMPLATES[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: isFreeLaunch ? template.bodyFree(listingTitle) : template.bodyPaid(listingTitle),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}/chalets/${listingId}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: trimmedFirstName ? template.subjectNamed(trimmedFirstName) : template.subjectGeneric,
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
