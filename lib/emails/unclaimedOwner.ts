import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";
import { SITE_URL } from "@/lib/siteUrl";

// Courriels des fiches non revendiquées (supabase/add-unclaimed-listings.sql) :
// au propriétaire qui n'a pas encore de compte (demande d'un voyageur, lien
// d'activation, avis d'activation) et au demandeur d'une vérification manuelle.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* = textes par défaut).

const FROM_MESSAGES = "Kabanalouer <messages@kabanalouer.ca>";
const FROM_NOREPLY = "Kabanalouer <no-reply@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

const REMOVE_PLACEHOLDER = { key: "lienRetrait", label: "Lien « Retirer ma fiche »", html: true } as const;
const LISTINGS_PLACEHOLDER = { key: "titresFiches", label: "Titre de chaque fiche concernée, un par ligne", html: true } as const;

export const TEMPLATE_UNCLAIMED_REQUEST: EmailTemplateDef = {
  id: "unclaimed-request",
  placeholders: [
    { key: "prenomExpediteur", label: "Prénom du voyageur qui a écrit" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "message", label: "Le message du voyageur, en italique entre guillemets", html: true },
    REMOVE_PLACEHOLDER,
  ],
  defaults: {
    fr: {
      subject: "Un voyageur s’intéresse à votre chalet : {titreChalet}",
      greeting: "Bonjour,",
      heading: "Un voyageur s’intéresse à votre chalet",
      body: "{prenomExpediteur} a écrit au sujet de « {titreChalet} » sur Kabanalouer :\n\n{message}\n\nVotre fiche a été créée à partir de renseignements publics et n’est pas encore activée. Activez-la pour répondre à ce voyageur et gérer votre fiche.",
      buttonLabel: "Activer ma fiche et répondre",
      footerNote: "Vous ne souhaitez pas que votre chalet figure sur Kabanalouer ? {lienRetrait}\n\nLe lien d’activation est valide 30 jours.",
    },
    en: {
      subject: "A traveler is interested in your cabin: {titreChalet}",
      greeting: "Hello,",
      heading: "A traveler is interested in your cabin",
      body: "{prenomExpediteur} wrote about “{titreChalet}” on Kabanalouer:\n\n{message}\n\nYour listing was created from public information and is not activated yet. Activate it to reply to this traveler and manage your listing.",
      buttonLabel: "Activate my listing and reply",
      footerNote: "Don’t want your cabin on Kabanalouer? {lienRetrait}\n\nThe activation link is valid for 30 days.",
    },
  },
};

export const TEMPLATE_CLAIM_LINK: EmailTemplateDef = {
  id: "claim-link",
  placeholders: [LISTINGS_PLACEHOLDER, REMOVE_PLACEHOLDER],
  defaults: {
    fr: {
      subject: "Votre lien pour activer votre fiche Kabanalouer",
      greeting: "Bonjour,",
      heading: "Activez votre fiche",
      body: "Quelqu’un a demandé l’envoi du lien d’activation pour :\n\n{titresFiches}\n\nSi c’est vous, cliquez sur le bouton ci-dessous. Sinon, vous pouvez ignorer ce message : rien ne sera modifié.",
      buttonLabel: "Activer ma fiche",
      footerNote: "Ce lien est valide 30 jours. {lienRetrait}",
    },
    en: {
      subject: "Your link to activate your Kabanalouer listing",
      greeting: "Hello,",
      heading: "Activate your listing",
      body: "Someone asked for the activation link for:\n\n{titresFiches}\n\nIf it was you, click the button below. Otherwise you can ignore this message: nothing will change.",
      buttonLabel: "Activate my listing",
      footerNote: "This link is valid for 30 days. {lienRetrait}",
    },
  },
};

export const TEMPLATE_CLAIM_ACTIVATED: EmailTemplateDef = {
  id: "claim-activated",
  placeholders: [LISTINGS_PLACEHOLDER, { key: "compteMasque", label: "Adresse du compte qui a activé, partiellement masquée" }],
  defaults: {
    fr: {
      subject: "Votre fiche Kabanalouer a été activée",
      greeting: "Bonjour,",
      heading: "Votre fiche a été activée",
      body: "{titresFiches}\n\nVotre fiche a été activée sur Kabanalouer par le compte {compteMasque}. Si c’est vous ou quelqu’un de votre équipe, tout est en ordre.\n\nSinon, signalez-le-nous et nous vérifierons.",
      buttonLabel: "Signaler un problème",
      footerNote: "Vous recevez ce message parce que cette adresse figurait au dossier de la fiche.",
    },
    en: {
      subject: "Your Kabanalouer listing has been activated",
      greeting: "Hello,",
      heading: "Your listing has been activated",
      body: "{titresFiches}\n\nYour listing was activated on Kabanalouer by the account {compteMasque}. If that was you or someone on your team, everything is in order.\n\nIf not, let us know and we will look into it.",
      buttonLabel: "Report a problem",
      footerNote: "You are receiving this message because this address was on file for the listing.",
    },
  },
};

export const TEMPLATE_CLAIM_WELCOME: EmailTemplateDef = {
  id: "claim-welcome",
  placeholders: [
    LISTINGS_PLACEHOLDER,
    { key: "prenom", label: "Prénom du nouveau propriétaire" },
    { key: "offre", label: "Phrase « Votre première année est gratuite. » (vide si l’offre de lancement est terminée)", html: true },
  ],
  defaults: {
    fr: {
      subject: "Bienvenue sur Kabanalouer : votre fiche est à vous",
      greeting: "Bonjour {prenom},",
      heading: "Bienvenue sur Kabanalouer",
      body: "Vous êtes maintenant propriétaire de :\n\n{titresFiches}\n\n{offre}Voici comment en tirer le meilleur :\n\n**1. Ajoutez vos propres photos.** Les voyageurs choisissent d’abord avec leurs yeux.\n\n**2. Vérifiez et complétez les détails** : équipements, chambres, règlements, prix.\n\n**3. Recevez les demandes par texto** en ajoutant votre numéro de cellulaire dans votre profil.\n\nLes voyageurs vous écrivent directement, sans frais de service.",
      buttonLabel: "Voir mes chalets",
      footerNote: "Une question ? Répondez simplement à ce courriel.",
    },
    en: {
      subject: "Welcome to Kabanalouer: your listing is now yours",
      greeting: "Hi {prenom},",
      heading: "Welcome to Kabanalouer",
      body: "You are now the owner of:\n\n{titresFiches}\n\n{offre}Here is how to make the most of it:\n\n**1. Add your own photos.** Travelers choose with their eyes first.\n\n**2. Check and complete the details**: amenities, rooms, rules, price.\n\n**3. Get requests by text message** by adding your cell phone number to your profile.\n\nTravelers write to you directly, with no service fees.",
      buttonLabel: "See my cabins",
      footerNote: "Any question? Just reply to this email.",
    },
  },
};

export const TEMPLATE_CLAIM_APPROVED: EmailTemplateDef = {
  id: "claim-approved",
  placeholders: [LISTINGS_PLACEHOLDER, { key: "prenom", label: "Prénom du demandeur" }],
  defaults: {
    fr: {
      subject: "Votre demande est approuvée",
      greeting: "Bonjour {prenom},",
      heading: "Votre demande est approuvée",
      body: "Vous êtes maintenant propriétaire de :\n\n{titresFiches}\n\nDepuis votre tableau de bord, vous pouvez tout modifier et répondre aux voyageurs.",
      buttonLabel: "Voir mes chalets",
      footerNote: "Une question ? Répondez simplement à ce courriel.",
    },
    en: {
      subject: "Your request is approved",
      greeting: "Hi {prenom},",
      heading: "Your request is approved",
      body: "You are now the owner of:\n\n{titresFiches}\n\nFrom your dashboard, you can edit everything and reply to travelers.",
      buttonLabel: "See my cabins",
      footerNote: "Any question? Just reply to this email.",
    },
  },
};

export const TEMPLATE_CLAIM_REFUSED: EmailTemplateDef = {
  id: "claim-refused",
  placeholders: [
    { key: "prenom", label: "Prénom du demandeur" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "noteAdmin", label: "Explication ajoutée par Kabanalouer (vide si aucune)", html: true },
  ],
  defaults: {
    fr: {
      subject: "À propos de votre demande pour {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "Nous n’avons pas pu confirmer votre demande",
      body: "Nous n’avons pas pu vérifier que la fiche « {titreChalet} » est la vôtre.{noteAdmin}\n\nVous pouvez répondre à ce courriel avec plus de détails, ou utiliser le lien d’activation envoyé à l’adresse inscrite au dossier de la fiche.",
      buttonLabel: "Nous écrire",
      footerNote: "Aucune modification n’a été apportée à la fiche.",
    },
    en: {
      subject: "About your request for {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "We could not confirm your request",
      body: "We could not verify that the listing “{titreChalet}” is yours.{noteAdmin}\n\nYou can reply to this email with more details, or use the activation link sent to the address on file for the listing.",
      buttonLabel: "Contact us",
      footerNote: "No changes were made to the listing.",
    },
  },
};

type Lang = "fr" | "en";

function titlesHtml(titles: string[]): string {
  return titles.map((t) => `<strong>${escapeHtml(t)}</strong>`).join("<br/>");
}

function removeAnchor(lang: Lang, url: string): string {
  return `<a href="${url}" style="color:#636e40;">${lang === "fr" ? "Retirer ma fiche" : "Remove my listing"}</a>`;
}

// Demande d'un voyageur, transmise au propriétaire qui n'a pas encore de compte.
export async function sendUnclaimedRequestEmail(input: {
  to: string;
  lang: Lang;
  listingTitle: string;
  senderFirstName: string;
  messageText: string;
  translated?: boolean;
  claimUrl: string;
  removeUrl: string;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  // Texte saisi par un voyageur : échappé, jamais interpolé tel quel dans le HTML.
  const trimmed = input.messageText.trim().replace(/^["'‘’“”«»]+|["'‘’“”«»]+$/g, "");
  const safe = escapeHtml(trimmed).replace(/\n/g, "<br/>");
  const quoted = fr ? `<em>« ${safe} »</em>` : `<em>“${safe}”</em>`;
  const note = input.translated
    ? `<p style="margin:8px 0 0;font-size:12px;color:#9a9a9a;">${fr ? "Traduit automatiquement de l’anglais" : "Automatically translated from French"}</p>`
    : "";
  const text = await resolveEmailText(TEMPLATE_UNCLAIMED_REQUEST, input.lang, {
    prenomExpediteur: input.senderFirstName,
    titreChalet: input.listingTitle,
    message: quoted + note,
    lienRetrait: removeAnchor(input.lang, input.removeUrl),
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.claimUrl });
  const { error } = await sendEmail({ from: FROM_MESSAGES, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Lien d'activation demandé par le bouton « C'est mon chalet » (option A).
export async function sendClaimLinkEmail(input: {
  to: string;
  lang: Lang;
  listingTitles: string[];
  claimUrl: string;
  removeUrl: string;
}): Promise<{ error: Error | null }> {
  const text = await resolveEmailText(TEMPLATE_CLAIM_LINK, input.lang, {
    titresFiches: titlesHtml(input.listingTitles),
    lienRetrait: removeAnchor(input.lang, input.removeUrl),
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.claimUrl });
  const { error } = await sendEmail({ from: FROM_NOREPLY, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Avis à l'ancienne adresse quand une fiche vient d'être activée.
export async function sendClaimActivatedEmail(input: {
  to: string;
  lang: Lang;
  listingTitles: string[];
  maskedClaimant: string;
  reportUrl: string;
}): Promise<{ error: Error | null }> {
  const text = await resolveEmailText(TEMPLATE_CLAIM_ACTIVATED, input.lang, {
    titresFiches: titlesHtml(input.listingTitles),
    compteMasque: input.maskedClaimant,
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.reportUrl });
  const { error } = await sendEmail({ from: FROM_NOREPLY, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Bienvenue au nouveau propriétaire, juste après une revendication par lien (option A).
// Après une approbation manuelle (option B), le courriel de décision joue ce rôle.
export async function sendClaimWelcomeEmail(input: {
  to: string;
  lang: Lang;
  firstName?: string | null;
  listingTitles: string[];
  freeYear: boolean;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  const offre = input.freeYear ? `<strong>${fr ? "Votre première année est gratuite." : "Your first year is free."}</strong><br/><br/>` : "";
  const text = await resolveEmailText(TEMPLATE_CLAIM_WELCOME, input.lang, {
    prenom: input.firstName?.trim(),
    titresFiches: titlesHtml(input.listingTitles),
    offre,
  });
  const html = renderEmail({
    lang: input.lang,
    ...text,
    buttonUrl: `${SITE_URL}${fr ? "" : "/en"}/dashboard/listings`,
  });
  const { error } = await sendEmail({ from: FROM_NOREPLY, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Réponse à une demande de vérification manuelle (option B).
export async function sendClaimDecisionEmail(input: {
  to: string;
  lang: Lang;
  listingTitle: string;
  listingTitles?: string[];
  firstName?: string | null;
  approved: boolean;
  adminNote?: string | null;
}): Promise<{ error: Error | null }> {
  const dashboard = `${SITE_URL}${input.lang === "en" ? "/en/dashboard/listings" : "/dashboard/listings"}`;
  const note = input.adminNote?.trim()
    ? `<br/><br/><em>${escapeHtml(input.adminNote.trim()).replace(/\n/g, "<br/>")}</em>`
    : "";
  const text = input.approved
    ? await resolveEmailText(TEMPLATE_CLAIM_APPROVED, input.lang, { prenom: input.firstName?.trim(), titresFiches: titlesHtml(input.listingTitles?.length ? input.listingTitles : [input.listingTitle]) })
    : await resolveEmailText(TEMPLATE_CLAIM_REFUSED, input.lang, { prenom: input.firstName?.trim(), titreChalet: input.listingTitle, noteAdmin: note });
  const html = renderEmail({
    lang: input.lang,
    ...text,
    buttonUrl: input.approved ? dashboard : "mailto:info@kabanalouer.ca",
  });
  const { error } = await sendEmail({ from: FROM_NOREPLY, to: [input.to], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}

// Alerte à l'équipe : une fiche importée a le même CITQ qu'une annonce déjà tenue par un vrai
// compte. La fiche est importée quand même (aucun refus) ; c'est à Simon de décider.
export async function sendImportDuplicateAlert(input: {
  listingId: string;
  title: string;
  citq: string;
  matches: { id: string; title: string; claim_status: string | null }[];
}): Promise<void> {
  const edit = (id: string) => `${SITE_URL}/dashboard/listings/${id}/edit`;
  const lines = input.matches
    .map((m) => `<li><a href="${edit(m.id)}">${escapeHtml(m.title)}</a> (${m.claim_status === "claimed" ? "fiche revendiquée" : "annonce d’un proprio inscrit"})</li>`)
    .join("");
  const html = `<p><strong>Doublon possible à l’import</strong></p>
<p>La fiche importée <a href="${edit(input.listingId)}">${escapeHtml(input.title)}</a> (CITQ ${escapeHtml(input.citq)}) a le même numéro CITQ que :</p>
<ul>${lines}</ul>
<p>Elle est importée quand même, non publiée pour l’instant. Un CITQ peut couvrir plusieurs unités : à vous de juger. Elle est aussi listée dans <a href="${SITE_URL}/admin/invitations">Admin → Invitations</a>.</p>`;
  const { error } = await sendEmail({ from: FROM_NOREPLY, to: [ADMIN_EMAIL], subject: `Doublon possible à l’import : ${input.title}`, html });
  if (error) console.error("sendImportDuplicateAlert: échec envoi", error);
}

// Alerte immédiate à l'équipe : demande de vérification ou signalement (texte
// simple, contenu des utilisateurs échappé). Jamais bloquant pour l'appelant.
export async function sendClaimAdminAlert(input: {
  kind: "proof" | "dispute";
  listingTitle: string;
  listingId: string;
  from: string;
  message: string | null;
}): Promise<void> {
  try {
    const label = input.kind === "proof" ? "Demande de vérification d’une fiche" : "Signalement après une activation";
    const html = `<p><strong>${label}</strong></p>
<p>Fiche : ${escapeHtml(input.listingTitle)}<br/>De : ${escapeHtml(input.from)}</p>
${input.kind === "proof" ? "<p>Une copie du permis CITQ est jointe à la demande.</p>" : ""}
${input.message ? `<p>${escapeHtml(input.message).replace(/\n/g, "<br/>")}</p>` : ""}
<p><a href="${SITE_URL}/admin/revendications">Ouvrir la file des revendications</a></p>`;
    const { error } = await sendEmail({ from: FROM_NOREPLY, to: [ADMIN_EMAIL], subject: `${label} : ${input.listingTitle}`, html });
    if (error) console.error("sendClaimAdminAlert: échec envoi", error);
  } catch (e) {
    console.error("sendClaimAdminAlert: erreur", e);
  }
}
