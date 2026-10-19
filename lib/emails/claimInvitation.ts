import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";
import { SITE_URL } from "@/lib/siteUrl";
import { formatLaunchOfferEnd, isLaunchOfferActive } from "@/lib/launchOffer";

// Invitation à revendiquer une fiche (envoyée automatiquement après la publication, ou depuis
// Admin → Invitations) et relance 3 jours plus tard. Part de info@kabanalouer.ca : les réponses arrivent chez Simon.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* = textes par défaut).

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const PLACEHOLDERS: EmailTemplateDef["placeholders"] = [
  { key: "fiches", label: "Titre de chaque fiche en ligne, avec un lien vers la fiche", html: true },
  { key: "offre", label: "Phrase sur l’offre de lancement avec sa date de fin (vide si l’offre est terminée)", html: true },
  { key: "gratuitement", label: "« gratuitement » quand l’offre de lancement est en cours (vide sinon), pour le bouton" },
  { key: "lienRetrait", label: "Lien « Retirer ma fiche » (un par fiche s’il y en a plusieurs)", html: true },
  { key: "suivi", label: "Pixel invisible qui compte les ouvertures (à laisser tel quel)", html: true },
];

export const TEMPLATE_CLAIM_INVITATION: EmailTemplateDef = {
  id: "claim-invitation",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Votre fiche est en ligne sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Votre fiche est en ligne sur Kabanalouer",
      body: "Nous avons mis en ligne une fiche pour votre établissement sur Kabanalouer, la plateforme québécoise où les voyageurs communiquent directement avec les propriétaires de chalets, sans frais de service pour eux.\n\n{fiches}\n\nElle a été créée à partir des renseignements publics de votre établissement. En l’activant, vous pourrez la modifier, ajouter vos propres photos et répondre directement aux voyageurs.{offre}",
      buttonLabel: "Activer ma fiche{gratuitement}",
      footerNote: "Vous ne souhaitez pas figurer sur Kabanalouer ? {lienRetrait}\n\nLe lien d’activation est valide 30 jours.{suivi}",
    },
    en: {
      subject: "Your listing is live on Kabanalouer",
      greeting: "Hello,",
      heading: "Your listing is live on Kabanalouer",
      body: "We have put a listing for your business online on Kabanalouer, the Quebec platform where travelers deal directly with cabin owners, with no service fees for them.\n\n{fiches}\n\nIt was created from your business’s public information. Once you activate it, you can edit it, add your own photos and reply to travelers directly.{offre}",
      buttonLabel: "Activate my listing{gratuitement}",
      footerNote: "Don’t want to be on Kabanalouer? {lienRetrait}\n\nThe activation link is valid for 30 days.{suivi}",
    },
  },
};

export const TEMPLATE_CLAIM_INVITATION_REMINDER: EmailTemplateDef = {
  id: "claim-invitation-reminder",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Votre fiche Kabanalouer vous attend",
      greeting: "Bonjour,",
      heading: "Votre fiche est toujours en ligne",
      body: "Il y a quelques jours, nous vous avons écrit au sujet de la fiche de votre établissement sur Kabanalouer.\n\n{fiches}\n\nElle est toujours en ligne, mais tant que vous ne l’avez pas activée, vous ne pouvez ni la modifier ni répondre directement aux voyageurs. L’activation ne prend que quelques minutes.{offre}",
      buttonLabel: "Activer ma fiche{gratuitement}",
      footerNote: "C’est notre dernier courriel à ce sujet. Vous ne souhaitez pas figurer sur Kabanalouer ? {lienRetrait}{suivi}",
    },
    en: {
      subject: "Your Kabanalouer listing is waiting for you",
      greeting: "Hello,",
      heading: "Your listing is still online",
      body: "A few days ago we wrote to you about your business’s listing on Kabanalouer.\n\n{fiches}\n\nIt is still online, but until you activate it you cannot edit it or reply to travelers directly. Activation only takes a few minutes.{offre}",
      buttonLabel: "Activate my listing{gratuitement}",
      footerNote: "This is our last email about this. Don’t want to be on Kabanalouer? {lienRetrait}{suivi}",
    },
  },
};

export type InvitationListing = { title: string; path: string | null };
export type InvitationRemoveLink = { title: string; url: string };

// Construit et envoie l'invitation (kind 'invite') ou la relance (kind 'reminder').
// Dans l'aperçu de l'admin, sendEmail capture le courriel au lieu de l'envoyer.
export async function sendClaimInvitationEmail(input: {
  to: string;
  lang: "fr" | "en";
  kind: "invite" | "reminder";
  listings: InvitationListing[];
  claimUrl: string;
  removeLinks: InvitationRemoveLink[];
  // Absent dans l'aperçu : pas de pixel de suivi
  trackToken?: string;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  const link = (href: string, label: string, bold = false) =>
    `<a href="${escapeHtml(href)}" style="color:#636e40;${bold ? "font-weight:600;" : ""}">${escapeHtml(label)}</a>`;

  const fiches = input.listings
    .map((l) => (l.path ? link(`${SITE_URL}${l.path}`, l.title, true) : `<strong>${escapeHtml(l.title)}</strong>`))
    .join("<br/>");
  const lienRetrait =
    input.removeLinks.length === 1
      ? link(input.removeLinks[0].url, fr ? "Retirer ma fiche" : "Remove my listing")
      : input.removeLinks.map((r) => link(r.url, fr ? `Retirer « ${r.title} »` : `Remove “${r.title}”`)).join("<br/>");

  const offerActive = isLaunchOfferActive();
  const offerEnd = formatLaunchOfferEnd(input.lang);
  const offre = offerActive && offerEnd
    ? `<br/><br/>${escapeHtml(fr ? `L’activation est gratuite : votre première année est offerte jusqu’au ${offerEnd}.` : `Activation is free: your first year is on us until ${offerEnd}.`)}`
    : "";
  const suivi = input.trackToken
    ? `<img src="${SITE_URL}/api/invitations/open/${input.trackToken}.gif" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`
    : "";

  const text = await resolveEmailText(
    input.kind === "invite" ? TEMPLATE_CLAIM_INVITATION : TEMPLATE_CLAIM_INVITATION_REMINDER,
    input.lang,
    {
      fiches,
      offre,
      gratuitement: offerActive ? (fr ? " gratuitement" : " for free") : "",
      lienRetrait,
      suivi,
    }
  );
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.claimUrl });
  const { error } = await sendEmail({ from: FROM, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}
