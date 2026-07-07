import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export type WinbackThreshold = 3 | 14;

const TEMPLATES: Record<WinbackThreshold, Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string) => string;
  buttonLabel: string;
  footerNote: string;
}>> = {
  3: {
    fr: {
      subjectGeneric: "Ton annonce Kabanalouer est invisible pour l'instant",
      subjectNamed: (firstName) => `${firstName}, ton annonce Kabanalouer est invisible pour l'instant`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "Ton annonce n'apparaît plus dans les résultats",
      body: (listingTitle) => `Depuis quelques jours, ${listingTitle} est invisible pour les voyageurs qui cherchent un chalet — ton abonnement Kabanalouer n'est plus actif. Rien n'est perdu : ta fiche, tes photos, tes avis sont toujours là. Réactive ton abonnement pour la rendre visible à nouveau.`,
      buttonLabel: "Réactiver mon abonnement",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "Your Kabanalouer listing is currently invisible",
      subjectNamed: (firstName) => `${firstName}, your Kabanalouer listing is currently invisible`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "Your listing isn't showing up in search results",
      body: (listingTitle) => `For a few days now, ${listingTitle} has been invisible to travelers searching for a cabin — your Kabanalouer subscription is no longer active. Nothing is lost: your listing, photos, and reviews are all still there. Reactivate your subscription to make it visible again.`,
      buttonLabel: "Reactivate my subscription",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
  14: {
    fr: {
      subjectGeneric: "14 jours que ton annonce est invisible — des voyageurs te cherchent peut-être",
      subjectNamed: (firstName) => `${firstName}, 14 jours que ton annonce est invisible — des voyageurs te cherchent peut-être`,
      greeting: (firstName) => `Bonjour ${firstName} !`,
      heading: "14 jours d'invisibilité, des réservations potentiellement manquées",
      body: (listingTitle) => `${listingTitle} est invisible depuis 14 jours — pendant ce temps, des voyageurs qui cherchaient un chalet dans ta région n'ont pas pu te trouver. Rien n'est perdu : ta fiche, tes photos, tes avis sont toujours intacts. Réactive ton abonnement pour redevenir visible.`,
      buttonLabel: "Réactiver mon abonnement",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subjectGeneric: "14 days invisible — travelers may be missing your listing",
      subjectNamed: (firstName) => `${firstName}, 14 days invisible — travelers may be missing your listing`,
      greeting: (firstName) => `Hi ${firstName}!`,
      heading: "14 days of invisibility, potentially missed bookings",
      body: (listingTitle) => `${listingTitle} has been invisible for 14 days — during that time, travelers searching for a cabin in your area couldn't find you. Nothing is lost: your listing, photos, and reviews are all still intact. Reactivate your subscription to become visible again.`,
      buttonLabel: "Reactivate my subscription",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
};

export async function sendWinbackReminderEmail({
  email,
  preferredLanguage,
  firstName,
  threshold,
  listingTitle,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  threshold: WinbackThreshold;
  listingTitle: string;
}): Promise<{ error: Error | null }> {
  const template = TEMPLATES[threshold][preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;
  const buttonPath = preferredLanguage === "en" ? "/en/dashboard/subscription" : "/dashboard/subscription";

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(trimmedFirstName) : undefined,
    heading: template.heading,
    body: template.body(listingTitle),
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${buttonPath}`,
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
