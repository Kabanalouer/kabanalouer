import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Récapitulatif d'une demande de prix envoyée SANS compte visible (POST /api/messages/guest).
// Le Reply-To est l'adresse de la conversation (conv-{token}@reply.kabanalouer.ca) : répondre
// à ce courriel écrit au proprio, pas à Kabanalouer. Si l'adresse appartenait déjà à un compte,
// le courriel prévient et le Reply-To est info@ (« ce n'était pas vous ? »).
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_GUEST_REQUEST = textes par défaut).

const FROM = "Kabanalouer <messages@kabanalouer.ca>";
const SUPPORT = "info@kabanalouer.ca";

export const TEMPLATE_GUEST_REQUEST: EmailTemplateDef = {
  id: "guest-request",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "titreChalet", label: "Titre du chalet" },
    { key: "resume", label: "Résumé de la demande : dates, voyageurs et message", html: true },
    { key: "suite", label: "Phrase finale : répondre au courriel (ou « ce n'était pas vous ? » si l'adresse avait déjà un compte)", html: true },
  ],
  defaults: {
    fr: {
      subject: "Votre demande pour {titreChalet}",
      greeting: "Bonjour {prenom},",
      heading: "Votre demande est envoyée",
      body: "Nous l’avons transmise au propriétaire de **{titreChalet}**. Voici ce que nous lui avons écrit :\n\n{resume}\n\n{suite}",
      buttonLabel: "Suivre ma demande",
      footerNote: "Aucun compte ni mot de passe à créer : le bouton vous connecte directement.",
    },
    en: {
      subject: "Your request for {titreChalet}",
      greeting: "Hi {prenom},",
      heading: "Your request has been sent",
      body: "We passed it on to the owner of **{titreChalet}**. Here is what we wrote to them:\n\n{resume}\n\n{suite}",
      buttonLabel: "Follow my request",
      footerNote: "No account or password to create: the button signs you in directly.",
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
  // Adresse de la conversation (réponse directe au proprio) ; absente si l'adresse avait déjà un compte
  replyTo?: string;
  existingAccount: boolean;
}): Promise<{ error: Error | null }> {
  const fr = input.lang === "fr";
  const row = (label: string, value: string) =>
    `<div style="display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid #f0f0f0;"><span style="color:#717171;">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const rows = [
    input.checkIn ? row(fr ? "Arrivée" : "Arrival", input.checkIn) : "",
    input.checkOut ? row(fr ? "Départ" : "Departure", input.checkOut) : "",
    input.guests ? row(fr ? "Voyageurs" : "Guests", String(input.guests)) : "",
  ].join("");
  const quoted = input.message?.trim()
    ? `<div style="margin-top:10px;padding:10px 12px;background:#f7f7f7;border-radius:10px;font-style:italic;">${escapeHtml(input.message.trim()).replace(/\n/g, "<br/>")}</div>`
    : "";

  const suite = input.existingAccount
    ? escapeHtml(
        fr
          ? "Cette adresse avait déjà un compte Kabanalouer. Si ce n’était pas vous, répondez simplement à ce courriel et nous interviendrons."
          : "This address already had a Kabanalouer account. If this wasn’t you, just reply to this email and we’ll step in."
      )
    : escapeHtml(
        fr
          ? "Vous pouvez aussi répondre directement à ce courriel : votre message sera transmis au propriétaire."
          : "You can also reply directly to this email: your message will be passed on to the owner."
      );

  const text = await resolveEmailText(TEMPLATE_GUEST_REQUEST, input.lang, {
    prenom: input.firstName?.trim(),
    titreChalet: input.listingTitle,
    resume: `${rows}${quoted}`,
    suite,
  });
  const html = renderEmail({ lang: input.lang, ...text, buttonUrl: input.followUrl });
  const { error } = await sendEmail({
    from: FROM,
    to: [input.to],
    subject: text.subject,
    html,
    replyTo: input.existingAccount ? SUPPORT : input.replyTo,
  });
  return { error: error ? new Error(error.message) : null };
}
