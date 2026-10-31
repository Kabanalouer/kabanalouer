import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";
import { SITE_URL } from "@/lib/siteUrl";
import { SITE_IS_FREE } from "@/lib/siteIsFree";

// Fiches en brouillon (propriétaires de plusieurs chalets, mode_publication = 'brouillon') : invitation à voir
// l'aperçu privé et à activer ses fiches, puis relances à J+3 et J+10. Part de info@kabanalouer.ca.
// Distinct de lib/emails/claimInvitation.ts (fiches déjà en ligne). Textes modifiables dans Admin → Séquences courriel.
// Typographie française : espace fine insécable (U+202F) avant ? ! ; et insécable (U+00A0) avant : et dans les guillemets.

const FROM = "Kabanalouer <info@kabanalouer.ca>";

const PLACEHOLDERS: EmailTemplateDef["placeholders"] = [
  { key: "titreChalet", label: "Titre du chalet (ou « Titre et 2 autres chalets » s’il y en a plusieurs), pour l’objet" },
  { key: "nombre", label: "Nombre de chalets (versions « plusieurs chalets » seulement)" },
  { key: "fiches", label: "Titre de chaque fiche avec un lien vers son aperçu (liste à puces s’il y en a plusieurs)", html: true },
  { key: "gratuitement", label: "« , gratuitement » quand la plateforme est gratuite (vide sinon), pour l’objet" },
  { key: "offre", label: "Phrase « L’activation est gratuite. » (vide si ce n’est plus le cas)", html: true },
  { key: "bouton", label: "Texte du bouton : « Voir l’aperçu » ou, si les fiches sont déjà revendiquées, « Activer mes fiches »" },
  { key: "retrait", label: "Phrase et liens « Retirer » (vide si le propriétaire a déjà revendiqué ses fiches)", html: true },
  { key: "suivi", label: "Pixel invisible qui compte les ouvertures (à laisser tel quel)", html: true },
];

const RETRAIT = "{retrait}{suivi}";

export const TEMPLATE_DRAFT_INVITATION: EmailTemplateDef = {
  id: "claim-draft-invitation",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Votre chalet est prêt sur Kabanalouer, il ne reste qu’à l’activer{gratuitement}",
      greeting: "Bonjour,",
      heading: "Votre chalet est prêt sur Kabanalouer",
      body: "Nous avons préparé la fiche de votre chalet sur Kabanalouer, la plateforme québécoise où les voyageurs communiquent directement avec les propriétaires de chalets, sans frais de service pour eux.\n\n{fiches}\n\nElle n’est pas encore en ligne : vous la voyez d’abord dans un aperçu privé. En l’activant, vous créez votre compte et elle est mise en ligne tout de suite.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "Your cabin is ready on Kabanalouer, all that’s left is to activate it{gratuitement}",
      greeting: "Hello,",
      heading: "Your cabin is ready on Kabanalouer",
      body: "We have prepared a listing for your cabin on Kabanalouer, the Quebec platform where travelers deal directly with cabin owners, with no service fees for them.\n\n{fiches}\n\nIt is not online yet: you first see it in a private preview. When you activate it, you create your account and it goes online right away.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export const TEMPLATE_DRAFT_INVITATION_MULTI: EmailTemplateDef = {
  id: "claim-draft-invitation-multi",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Vos {nombre} chalets sont prêts sur Kabanalouer, il ne reste qu’à les activer{gratuitement}",
      greeting: "Bonjour,",
      heading: "Vos {nombre} chalets sont prêts sur Kabanalouer",
      body: "Nous avons préparé les fiches de vos {nombre} chalets sur Kabanalouer, la plateforme québécoise où les voyageurs communiquent directement avec les propriétaires de chalets, sans frais de service pour eux.\n\n{fiches}\n\nElles ne sont pas encore en ligne : vous les voyez d’abord dans un aperçu privé. En les activant, vous créez votre compte et elles sont toutes mises en ligne tout de suite.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "Your {nombre} cabins are ready on Kabanalouer, all that’s left is to activate them{gratuitement}",
      greeting: "Hello,",
      heading: "Your {nombre} cabins are ready on Kabanalouer",
      body: "We have prepared listings for your {nombre} cabins on Kabanalouer, the Quebec platform where travelers deal directly with cabin owners, with no service fees for them.\n\n{fiches}\n\nThey are not online yet: you first see them in a private preview. When you activate them, you create your account and they all go online right away.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export const TEMPLATE_DRAFT_REMINDER_3: EmailTemplateDef = {
  id: "claim-draft-reminder-3",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "{titreChalet} vous attend sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Votre chalet n’est pas encore en ligne",
      body: "Il y a quelques jours, nous vous avons écrit au sujet de la fiche de votre chalet sur Kabanalouer.\n\n{fiches}\n\nElle n’est pas encore activée, donc les voyageurs ne la voient pas. L’aperçu se parcourt en quelques minutes et l’activation se fait en quelques clics.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "{titreChalet} is waiting for you on Kabanalouer",
      greeting: "Hello,",
      heading: "Your cabin is not online yet",
      body: "A few days ago we wrote to you about your cabin’s listing on Kabanalouer.\n\n{fiches}\n\nIt is not activated yet, so travelers can’t see it. The preview takes a few minutes to look through and activation takes a few clicks.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export const TEMPLATE_DRAFT_REMINDER_3_MULTI: EmailTemplateDef = {
  id: "claim-draft-reminder-3-multi",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Vos {nombre} chalets vous attendent sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Vos {nombre} chalets ne sont pas encore en ligne",
      body: "Il y a quelques jours, nous vous avons écrit au sujet des fiches de vos {nombre} chalets sur Kabanalouer.\n\n{fiches}\n\nAucune n’est encore activée, donc les voyageurs ne les voient pas. L’aperçu se parcourt en quelques minutes et vous pouvez toutes les activer d’un coup.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "Your {nombre} cabins are waiting for you on Kabanalouer",
      greeting: "Hello,",
      heading: "Your {nombre} cabins are not online yet",
      body: "A few days ago we wrote to you about the listings for your {nombre} cabins on Kabanalouer.\n\n{fiches}\n\nNone is activated yet, so travelers can’t see them. The preview takes a few minutes to look through and you can activate them all at once.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export const TEMPLATE_DRAFT_REMINDER_10: EmailTemplateDef = {
  id: "claim-draft-reminder-10",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Dernier rappel : {titreChalet} sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Votre fiche est toujours en attente",
      body: "Nous vous avons écrit il y a une dizaine de jours au sujet de la fiche de votre chalet sur Kabanalouer.\n\n{fiches}\n\nElle reste hors ligne tant que vous ne l’avez pas activée. C’est notre dernier courriel à ce sujet.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "Last reminder: {titreChalet} on Kabanalouer",
      greeting: "Hello,",
      heading: "Your listing is still waiting",
      body: "We wrote to you about ten days ago about your cabin’s listing on Kabanalouer.\n\n{fiches}\n\nIt stays offline until you activate it. This is our last email about it.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export const TEMPLATE_DRAFT_REMINDER_10_MULTI: EmailTemplateDef = {
  id: "claim-draft-reminder-10-multi",
  placeholders: PLACEHOLDERS,
  defaults: {
    fr: {
      subject: "Dernier rappel : vos {nombre} chalets sur Kabanalouer",
      greeting: "Bonjour,",
      heading: "Vos {nombre} fiches sont toujours en attente",
      body: "Nous vous avons écrit il y a une dizaine de jours au sujet des fiches de vos {nombre} chalets sur Kabanalouer.\n\n{fiches}\n\nElles restent hors ligne tant que vous ne les avez pas activées. C’est notre dernier courriel à ce sujet.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
    en: {
      subject: "Last reminder: your {nombre} cabins on Kabanalouer",
      greeting: "Hello,",
      heading: "Your {nombre} listings are still waiting",
      body: "We wrote to you about ten days ago about the listings for your {nombre} cabins on Kabanalouer.\n\n{fiches}\n\nThey stay offline until you activate them. This is our last email about it.{offre}",
      buttonLabel: "{bouton}",
      footerNote: RETRAIT,
    },
  },
};

export type DraftInvitationKind = "draft_invite" | "draft_reminder_3" | "draft_reminder_10";
export type DraftEmailListing = { title: string; url: string };
export type DraftEmailRemoveLink = { title: string; url: string };

function templateFor(kind: DraftInvitationKind, multiple: boolean): EmailTemplateDef {
  if (kind === "draft_invite") return multiple ? TEMPLATE_DRAFT_INVITATION_MULTI : TEMPLATE_DRAFT_INVITATION;
  if (kind === "draft_reminder_3") return multiple ? TEMPLATE_DRAFT_REMINDER_3_MULTI : TEMPLATE_DRAFT_REMINDER_3;
  return multiple ? TEMPLATE_DRAFT_REMINDER_10_MULTI : TEMPLATE_DRAFT_REMINDER_10;
}

// Envoie l'invitation brouillon ou une relance. Dans l'aperçu de l'admin, sendEmail capture le courriel au lieu de l'envoyer.
// buttonUrl : l'aperçu privé (jeton) ; si le propriétaire a déjà revendiqué ses fiches (claimed), son tableau de bord.
export async function sendDraftInvitationEmail(input: {
  to: string;
  lang: "fr" | "en";
  kind: DraftInvitationKind;
  listings: DraftEmailListing[];
  buttonUrl: string;
  removeLinks: DraftEmailRemoveLink[];
  claimed?: boolean;
  trackToken?: string;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  const link = (href: string, label: string, bold = false) =>
    `<a href="${escapeHtml(href)}" style="color:#636e40;${bold ? "font-weight:600;" : ""}">${escapeHtml(label)}</a>`;

  const multiple = input.listings.length > 1;
  // Puces faites à la main (le texte du courriel est dans un <p>), même méthode que claimInvitation.ts
  const bullets = (list: string[]) =>
    list
      .map((html, i) => `<span style="display:block;padding-left:14px;text-indent:-14px;margin:0 0 ${i === list.length - 1 ? -22 : 6}px 0;">•&nbsp; ${html}</span>`)
      .join("");
  const items = input.listings.map((l) => link(l.url, l.title, true));
  const fiches = multiple ? bullets(items) : items[0] ?? "";

  const removeItems = input.removeLinks.map((r) => link(r.url, fr ? `Retirer « ${r.title} »` : `Remove “${r.title}”`));
  let retrait = "";
  if (!input.claimed && input.removeLinks.length > 0) {
    retrait = multiple
      ? `${escapeHtml(fr ? "Vous ne souhaitez pas figurer sur Kabanalouer ? Vous pouvez retirer chaque chalet :" : "Don’t want to be on Kabanalouer? You can remove each cabin:")}<br/>${bullets(removeItems)}`
      : `${escapeHtml(fr ? "Vous ne souhaitez pas figurer sur Kabanalouer ?" : "Don’t want to be on Kabanalouer?")} ${link(input.removeLinks[0].url, fr ? "Retirer ma fiche" : "Remove my listing")}`;
  }

  const offerActive = SITE_IS_FREE;
  const offre = offerActive ? `<br/><br/>${escapeHtml(fr ? "L’activation est gratuite." : "Activation is free.")}` : "";
  const suivi = input.trackToken
    ? `<img src="${SITE_URL}/api/invitations/open/${input.trackToken}.gif" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`
    : "";

  const first = input.listings[0]?.title ?? (fr ? "Votre fiche" : "Your listing");
  const others = input.listings.length - 1;
  const subjectTitle =
    others <= 0 ? first : fr ? `${first} et ${others} autre${others > 1 ? "s" : ""} chalet${others > 1 ? "s" : ""}` : `${first} and ${others} other cabin${others > 1 ? "s" : ""}`;

  const bouton = input.claimed
    ? multiple ? (fr ? "Activer mes fiches" : "Activate my listings") : fr ? "Activer ma fiche" : "Activate my listing"
    : multiple ? (fr ? "Voir l’aperçu de mes fiches" : "See the preview of my listings") : fr ? "Voir l’aperçu de ma fiche" : "See the preview of my listing";

  const text = await resolveEmailText(templateFor(input.kind, multiple), input.lang, {
    titreChalet: subjectTitle,
    nombre: String(input.listings.length),
    fiches,
    gratuitement: offerActive ? (fr ? ", gratuitement" : ", for free") : "",
    offre,
    bouton,
    retrait,
    suivi,
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.buttonUrl });
  const { error } = await sendEmail({ from: FROM, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}
