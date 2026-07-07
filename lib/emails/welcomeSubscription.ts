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
  body: (listingTitle: string) => string;
  buttonLabel: string;
  buttonPath: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Bienvenue ! Ton abonnement Kabanalouer est actif",
    subjectNamed: (firstName) => `Bienvenue ${firstName} ! Ton abonnement Kabanalouer est actif`,
    greeting: (firstName) => `Bonjour ${firstName} !`,
    heading: "Ton abonnement est actif !",
    body: (listingTitle) => `Merci de faire confiance à Kabanalouer. Ton abonnement annuel pour ${listingTitle} est maintenant actif — si ce n'est pas déjà fait, complète et publie ton annonce pour commencer à recevoir des demandes de voyageurs.`,
    buttonLabel: "Compléter mon annonce",
    buttonPath: "/dashboard/listings",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "Welcome! Your Kabanalouer subscription is active",
    subjectNamed: (firstName) => `Welcome ${firstName}! Your Kabanalouer subscription is active`,
    greeting: (firstName) => `Hi ${firstName}!`,
    heading: "Your subscription is active!",
    body: (listingTitle) => `Thanks for trusting Kabanalouer. Your annual subscription for ${listingTitle} is now active — if you haven't already, complete and publish your listing to start receiving requests from travelers.`,
    buttonLabel: "Complete my listing",
    buttonPath: "/en/dashboard/listings",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendWelcomeSubscriptionEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
}): Promise<{ error: Error | null }> {
  const template = TEMPLATES[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${template.buttonPath}`,
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
