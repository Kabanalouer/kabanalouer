import { Resend } from "resend";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "Kabanalouer <info@kabanalouer.ca>";

// ── Courriel initial : choix "J'ai échangé" / "J'ai réservé" ────────────────

const INITIAL_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string) => string;
  exchangeButtonLabel: string;
  stayButtonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Comment s'est passé votre contact avec le propriétaire ?",
    subjectNamed: (firstName) => `${firstName}, comment s'est passé votre contact avec le propriétaire ?`,
    greeting: (firstName) => `Bonjour ${firstName},`,
    heading: "Partagez votre expérience",
    body: (listingTitle) => `Vous avez échangé avec le propriétaire de ${listingTitle} sur Kabanalouer. On aimerait connaître votre expérience — ça prend 30 secondes.`,
    exchangeButtonLabel: "J'ai échangé avec le propriétaire",
    stayButtonLabel: "J'ai réservé le chalet",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "How did your contact with the owner go?",
    subjectNamed: (firstName) => `${firstName}, how did your contact with the owner go?`,
    greeting: (firstName) => `Hi ${firstName},`,
    heading: "Share your experience",
    body: (listingTitle) => `You reached out to the owner of ${listingTitle} on Kabanalouer. We'd love to hear how it went — it takes 30 seconds.`,
    exchangeButtonLabel: "I contacted the owner",
    stayButtonLabel: "I booked the cabin",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendReviewRequestEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
  echangeUrl,
  stayUrl,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  echangeUrl: string;
  stayUrl: string;
}): Promise<{ error: Error | null }> {
  const template = INITIAL_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;

  // firstName/listingTitle viennent de données saisies par les utilisateurs
  // (nom de profil, titre d'annonce) — jamais interpolées telles quelles.
  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(escapeHtml(trimmedFirstName)) : undefined,
    heading: template.heading,
    body: template.body(escapeHtml(listingTitle)),
    buttonLabel: template.exchangeButtonLabel,
    buttonUrl: echangeUrl,
    secondaryButtonLabel: template.stayButtonLabel,
    secondaryButtonUrl: stayUrl,
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

// ── 2e courriel : demande d'avis de séjour (check_out + 24h dépassé) ────────

const STAY_TEMPLATE: Record<"fr" | "en", {
  subjectGeneric: string;
  subjectNamed: (firstName: string) => string;
  greeting: (firstName: string) => string;
  heading: string;
  body: (listingTitle: string) => string;
  buttonLabel: string;
  footerNote: string;
}> = {
  fr: {
    subjectGeneric: "Comment s'est passé votre séjour ?",
    subjectNamed: (firstName) => `${firstName}, comment s'est passé votre séjour ?`,
    greeting: (firstName) => `Bonjour ${firstName},`,
    heading: "Comment s'est passé votre séjour ?",
    body: (listingTitle) => `Vous avez récemment séjourné à ${listingTitle}. Racontez-nous comment ça s'est passé — ça prend 30 secondes et ça aide les prochains voyageurs.`,
    buttonLabel: "Laisser mon avis de séjour",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subjectGeneric: "How was your stay?",
    subjectNamed: (firstName) => `${firstName}, how was your stay?`,
    greeting: (firstName) => `Hi ${firstName},`,
    heading: "How was your stay?",
    body: (listingTitle) => `You recently stayed at ${listingTitle}. Tell us how it went — it takes 30 seconds and helps future travelers.`,
    buttonLabel: "Leave my stay review",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendStayReviewRequestEmail({
  email,
  preferredLanguage,
  firstName,
  listingTitle,
  stayUrl,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  stayUrl: string;
}): Promise<{ error: Error | null }> {
  const template = STAY_TEMPLATE[preferredLanguage];
  const trimmedFirstName = firstName?.trim() || undefined;

  const html = renderEmail({
    lang: preferredLanguage,
    greeting: trimmedFirstName ? template.greeting(escapeHtml(trimmedFirstName)) : undefined,
    heading: template.heading,
    body: template.body(escapeHtml(listingTitle)),
    buttonLabel: template.buttonLabel,
    buttonUrl: stayUrl,
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
