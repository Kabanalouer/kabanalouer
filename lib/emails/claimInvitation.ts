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
  { key: "titreChalet", label: "Titre du chalet (ou « Titre et 2 autres chalets » s’il y en a plusieurs), pour l’objet" },
  { key: "nombre", label: "Nombre de chalets (version « plusieurs chalets » seulement)" },
  { key: "fiches", label: "Titre de chaque fiche en ligne, avec un lien vers la fiche (liste à puces s’il y en a plusieurs)", html: true },
  { key: "offre", label: "Phrase sur l’offre de lancement avec sa date de fin (vide si l’offre est terminée)", html: true },
  { key: "gratuitement", label: "« gratuitement » quand l’offre de lancement est en cours (vide sinon), pour le bouton" },
  { key: "lienRetrait", label: "Lien « Retirer ma fiche » (une liste à puces, un lien par chalet, s’il y en a plusieurs)", html: true },
  { key: "suivi", label: "Pixel invisible qui compte les ouvertures (à laisser tel quel)", html: true },
];

export const TEMPLATE_CLAIM_INVITATION: EmailTemplateDef = {
  id: "claim-invitation",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{titreChalet} sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Votre fiche est en ligne sur Kabanalouer",
      body: "Nous avons mis en ligne une fiche pour votre établissement sur Kabanalouer, la plateforme québécoise où les voyageurs communiquent directement avec les propriétaires de chalets, sans frais de service pour eux.\n\n{fiches}\n\nElle a été créée à partir des renseignements publics de votre établissement. En l’activant, vous pourrez la modifier, ajouter vos propres photos et répondre directement aux voyageurs.{offre}",
      buttonLabel: "Activer ma fiche{gratuitement}",
      footerNote: "Vous ne souhaitez pas figurer sur Kabanalouer ? {lienRetrait}\n\nLe lien d’activation est valide 30 jours.{suivi}",
    },
    en: {
      subject: "{titreChalet} on Kabanalouer",
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
      subject: "{titreChalet} sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Votre fiche est toujours en ligne",
      body: "Il y a quelques jours, nous vous avons écrit au sujet de la fiche de votre établissement sur Kabanalouer.\n\n{fiches}\n\nElle est toujours en ligne, mais tant que vous ne l’avez pas activée, vous ne pouvez ni la modifier ni répondre directement aux voyageurs. L’activation ne prend que quelques minutes.{offre}",
      buttonLabel: "Activer ma fiche{gratuitement}",
      footerNote: "C’est notre dernier courriel à ce sujet. Vous ne souhaitez pas figurer sur Kabanalouer ? {lienRetrait}{suivi}",
    },
    en: {
      subject: "{titreChalet} on Kabanalouer",
      greeting: "Hello,",
      heading: "Your listing is still online",
      body: "A few days ago we wrote to you about your business’s listing on Kabanalouer.\n\n{fiches}\n\nIt is still online, but until you activate it you cannot edit it or reply to travelers directly. Activation only takes a few minutes.{offre}",
      buttonLabel: "Activate my listing{gratuitement}",
      footerNote: "This is our last email about this. Don’t want to be on Kabanalouer? {lienRetrait}{suivi}",
    },
  },
};

// Version « plusieurs chalets » (même adresse, 2 fiches ou plus) : textes au pluriel avec le nombre de chalets, liste
// à puces des fiches et des liens « Retirer ». Choisie automatiquement par sendClaimInvitationEmail ; les textes
// du cas d'un seul chalet (au singulier) sont ceux de TEMPLATE_CLAIM_INVITATION ci-dessus.
export const TEMPLATE_CLAIM_INVITATION_MULTI: EmailTemplateDef = {
  id: "claim-invitation-multi",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{titreChalet} sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Vos {nombre} chalets sont en ligne sur Kabanalouer",
      body: "Nous avons mis en ligne des fiches pour vos {nombre} chalets sur Kabanalouer, la marketplace de la location de chalet au Québec.\n\n{fiches}\n\nEn les activant, vous pourrez les modifier et répondre directement aux voyageurs.\n\nLa publication de vos annonces est gratuite.",
      buttonLabel: "Activer mes {nombre} fiches{gratuitement}",
      footerNote: "Vous ne souhaitez pas figurer sur Kabanalouer ? Vous pouvez retirer chaque chalet :\n{lienRetrait}\n\nLe lien d’activation est valide 30 jours.{suivi}",
    },
    en: {
      subject: "{titreChalet} on Kabanalouer",
      greeting: "Hello,",
      heading: "Your {nombre} cabins are live on Kabanalouer",
      body: "We have put listings for your {nombre} cabins online on Kabanalouer, the Quebec platform where travelers deal directly with cabin owners, with no service fees for them.\n\n{fiches}\n\nOnce you activate them, you can edit them and reply to travelers directly.\n\nPublishing your listings is free.",
      buttonLabel: "Activate my {nombre} listings{gratuitement}",
      footerNote: "Don’t want to be on Kabanalouer? You can remove each cabin:\n{lienRetrait}\n\nThe activation link is valid for 30 days.{suivi}",
    },
  },
};

export const TEMPLATE_CLAIM_INVITATION_REMINDER_MULTI: EmailTemplateDef = {
  id: "claim-invitation-reminder-multi",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{titreChalet} sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Vos {nombre} chalets sont toujours en ligne",
      body: "Il y a quelques jours, nous vous avons écrit au sujet des fiches de vos {nombre} chalets sur Kabanalouer.\n\n{fiches}\n\nElles sont toujours en ligne, mais tant que vous ne les avez pas activées, vous ne pouvez ni les modifier, ni répondre directement aux voyageurs.\n\nL’activation ne prend que quelques minutes. Et c’est gratuit !",
      buttonLabel: "Activer mes {nombre} fiches{gratuitement}",
      footerNote: "C’est notre dernier courriel à ce sujet. Vous ne souhaitez pas figurer sur Kabanalouer ? Vous pouvez retirer chaque chalet :\n{lienRetrait}{suivi}",
    },
    en: {
      subject: "{titreChalet} on Kabanalouer",
      greeting: "Hello,",
      heading: "Your {nombre} cabins are still online",
      body: "A few days ago we wrote to you about the listings for your {nombre} cabins on Kabanalouer.\n\n{fiches}\n\nThey are still online, but until you activate them you cannot edit them or reply to travelers directly.\n\nActivation only takes a few minutes. And it’s free!",
      buttonLabel: "Activate my {nombre} listings{gratuitement}",
      footerNote: "This is our last email about this. Don’t want to be on Kabanalouer? You can remove each cabin:\n{lienRetrait}{suivi}",
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

  const multiple = input.listings.length > 1;
  // Puces faites à la main (pas de <ul> : le texte du courriel est dans un <p>) : retrait suspendu, « • » en tête ;
  // marge négative sous la dernière : le saut de ligne qui suit un bloc ajouterait sinon une ligne vide de trop.
  const bullets = (list: string[]) =>
    list
      .map((html, i) => `<span style="display:block;padding-left:14px;text-indent:-14px;margin:0 0 ${i === list.length - 1 ? -22 : 6}px 0;">•&nbsp; ${html}</span>`)
      .join("");
  const items = input.listings.map((l) => (l.path ? link(`${SITE_URL}${l.path}`, l.title, true) : `<strong>${escapeHtml(l.title)}</strong>`));
  const fiches = multiple ? bullets(items) : items[0] ?? "";
  const removeItems = input.removeLinks.map((r) => link(r.url, fr ? `Retirer « ${r.title} »` : `Remove “${r.title}”`));
  const lienRetrait = multiple
    ? bullets(removeItems)
    : input.removeLinks.length === 1
      ? link(input.removeLinks[0].url, fr ? "Retirer ma fiche" : "Remove my listing")
      : removeItems.join("<br/>");

  const offerActive = isLaunchOfferActive();
  const offerEnd = formatLaunchOfferEnd(input.lang);
  const offre = offerActive && offerEnd
    ? `<br/><br/>${escapeHtml(fr ? `L’activation est gratuite : votre première année est offerte jusqu’au ${offerEnd}.` : `Activation is free: your first year is on us until ${offerEnd}.`)}`
    : "";
  const suivi = input.trackToken
    ? `<img src="${SITE_URL}/api/invitations/open/${input.trackToken}.gif" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`
    : "";

  const first = input.listings[0]?.title ?? (fr ? "Votre fiche" : "Your listing");
  const others = input.listings.length - 1;
  const subjectTitle =
    others <= 0 ? first : fr ? `${first} et ${others} autre${others > 1 ? "s" : ""} chalet${others > 1 ? "s" : ""}` : `${first} and ${others} other cabin${others > 1 ? "s" : ""}`;

  const template = multiple
    ? input.kind === "invite" ? TEMPLATE_CLAIM_INVITATION_MULTI : TEMPLATE_CLAIM_INVITATION_REMINDER_MULTI
    : input.kind === "invite" ? TEMPLATE_CLAIM_INVITATION : TEMPLATE_CLAIM_INVITATION_REMINDER;
  const text = await resolveEmailText(
    template,
    input.lang,
    {
      titreChalet: subjectTitle,
      nombre: String(input.listings.length),
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
