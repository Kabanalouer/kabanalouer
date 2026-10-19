import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Récapitulatif d'une demande de prix envoyée SANS compte visible (POST /api/messages/guest).
// Le Reply-To est l'adresse de la conversation (conv-{token}@reply.kabanalouer.ca) : répondre
// à ce courriel écrit au proprio, pas à Kabanalouer. Si l'adresse appartenait déjà à un compte,
// le courriel ajoute une note « ce n'était pas vous ? » (écrire à info@) ; le Reply-To reste la conversation.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_GUEST_REQUEST = textes par défaut).

const FROM = "Kabanalouer <messages@kabanalouer.ca>";
const SUPPORT = "info@kabanalouer.ca";

export const TEMPLATE_GUEST_REQUEST: EmailTemplateDef = {
  id: "guest-request",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "resume", label: "Résumé de la demande : dates, voyageurs et message", html: true },
    { key: "suite", label: "Phrase sous le bouton : répondre au courriel (ou « ce n'était pas vous ? » si l'adresse avait déjà un compte)", html: true },
  ],
  defaults: {
    fr: {
      subject: "Votre demande pour {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "Votre demande est envoyée",
      body: "Nous l’avons transmise au propriétaire de **{titreChalet}**. Voici ce que nous lui avons écrit :\n\n{resume}",
      buttonLabel: "Suivre ma demande",
      footerNote: "{suite}",
    },
    en: {
      subject: "Your request for {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "Your request has been sent",
      body: "We passed it on to the owner of **{titreChalet}**. Here is what we wrote to them:\n\n{resume}",
      buttonLabel: "Follow my request",
      footerNote: "{suite}",
    },
  },
};

export async function sendGuestRequestEmail(input: {
  to: string;
  lang: "fr" | "en";
  firstName?: string | null;
  listingTitle: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  message?: string | null;
  followUrl: string;
  // Adresse de la conversation (réponse directe au proprio)
  replyTo?: string;
  existingAccount: boolean;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  // Tableau (et non flex) : Gmail et Outlook ignorent « display:flex » et collent l'étiquette à la valeur
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;color:#717171;font-size:15px;">${escapeHtml(label)}${fr ? "\u00a0:" : ":"}</td><td align="right" style="padding:6px 0 6px 16px;border-bottom:1px solid #f0f0f0;font-size:15px;color:#222222;"><strong>${escapeHtml(value)}</strong></td></tr>`;
  const rows = [
    input.checkIn ? row(fr ? "Arrivée" : "Arrival", input.checkIn) : "",
    input.checkOut ? row(fr ? "Départ" : "Departure", input.checkOut) : "",
    input.guests ? row(fr ? "Voyageurs" : "Guests", String(input.guests)) : "",
  ].join("");
  const table = rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>` : "";
  const quoted = input.message?.trim()
    ? `<div style="margin-top:10px;padding:10px 12px;background:#f7f7f7;border-radius:10px;font-style:italic;">${escapeHtml(input.message.trim()).replace(/\n/g, "<br/>")}</div>`
    : "";

  // Sous le bouton : toujours la phrase de réponse ; en plus, si l'adresse avait déjà un compte, une 2e note
  // (« ce n'était pas vous ? »), avec un bon espace entre les deux et sous le bouton.
  const replyNote = escapeHtml(
    fr
      ? "Répondez directement à ce message (reply) pour contacter le propriétaire directement."
      : "Reply directly to this message to contact the owner directly."
  );
  const mail = `<a href="mailto:${SUPPORT}" style="color:#636e40;">${SUPPORT}</a>`;
  const accountNote = fr
    ? `Cette adresse avait déjà un compte Kabanalouer. Si ce n’était pas vous, écrivez-nous à ${mail}.`
    : `This address already had a Kabanalouer account. If this wasn’t you, write to us at ${mail}.`;
  const suite =
    `<span style="display:block;padding-top:12px;">${replyNote}</span>` +
    (input.existingAccount ? `<span style="display:block;padding-top:22px;">${accountNote}</span>` : "");

  const text = await resolveEmailText(TEMPLATE_GUEST_REQUEST, input.lang, {
    prenom: input.firstName?.trim(),
    titreChalet: input.listingTitle,
    resume: `${table}${quoted}`,
    suite,
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.followUrl });
  const { error } = await sendEmail({
    from: FROM,
    to: [input.to],
    subject: text.subject,
    html,
    replyTo: input.replyTo,
  });
  return { error: error ? new Error(error.message) : null };
}
