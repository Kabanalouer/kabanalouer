import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

// Relance au voyageur quand le proprio n'a pas répondu 48 h après son premier
// message, avec 3 chalets semblables (cron /api/cron/no-reply-nudges).
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_NO_REPLY_NUDGE =
// textes par défaut). Les cartes de chalets et le 2e bouton sont construits ici.

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export const TEMPLATE_NO_REPLY_NUDGE: EmailTemplateDef = {
  id: "no-reply-nudge",
  placeholders: [
    { key: "prenom", label: "Prénom du voyageur" },
    { key: "prenomProprio", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet contacté" },
    { key: "lieu", label: "« à Mille-Isles » ou « dans les Laurentides » (en anglais « in Mille-Isles »)" },
  ],
  defaults: {
    fr: {
      subject: "Pas encore de réponse de {prenomProprio} ? Voici d'autres chalets {lieu}",
      greeting: "Bonjour {prenom} !",
      heading: "{prenomProprio} n'a pas encore répondu",
      body: "Tu as écrit à {prenomProprio} il y a 2 jours au sujet de **{titreChalet}**. Ta demande reste dans sa messagerie et on te préviendra dès sa réponse.\n\nEn attendant, ces chalets semblables {lieu} pourraient t'intéresser :",
      buttonLabel: "Voir les chalets {lieu}",
      footerNote: "Tu reçois ce courriel une seule fois par demande restée sans réponse. Tu peux gérer tes notifications dans ton profil.",
    },
    en: {
      subject: "No reply from {prenomProprio} yet? Here are other cabins {lieu}",
      greeting: "Hi {prenom}!",
      heading: "{prenomProprio} hasn't replied yet",
      body: "You wrote to {prenomProprio} 2 days ago about **{titreChalet}**. Your request is still in their inbox and we'll let you know as soon as they reply.\n\nIn the meantime, these similar cabins {lieu} might interest you:",
      buttonLabel: "See cabins {lieu}",
      footerNote: "You only get this email once per unanswered request. You can manage your notifications in your profile.",
    },
  },
};

const CONVERSATION_BUTTON = { fr: "Voir ma conversation", en: "View my conversation" } as const;

export type NudgeSuggestion = {
  title: string;
  city: string | null;
  capacity: number | null;
  bedrooms: number | null;
  price: number | null;
  priceOnRequest: boolean;
  photoUrl: string | null;
  path: string;
};

const FONT = "'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Photo convertie en JPG (/api/email-photo) : les vieux Outlook n'affichent pas le WebP.
function emailPhoto(url: string): string {
  return `${SITE_URL}/api/email-photo?src=${encodeURIComponent(url)}`;
}

function suggestionCards(items: NudgeSuggestion[], lang: "fr" | "en"): string {
  const fr = lang === "fr";
  const rows = items.map((l) => {
    const meta = [
      l.city ? escapeHtml(l.city) : null,
      l.capacity ? (fr ? `${l.capacity} pers.` : `${l.capacity} guests`) : null,
      l.bedrooms ? (fr ? `${l.bedrooms} ch.` : `${l.bedrooms} bd`) : null,
    ].filter(Boolean).join(" · ");
    const price = !l.priceOnRequest && l.price
      ? (fr ? `<strong>${l.price} $</strong> / nuit` : `<strong>$${l.price}</strong> / night`)
      : (fr ? "Prix sur demande" : "Price on request");
    const photo = l.photoUrl
      ? `<img src="${emailPhoto(l.photoUrl)}" width="88" height="88" alt="" style="display:block;width:88px;height:88px;border-radius:8px;border:0;">`
      : `<div style="width:88px;height:88px;border-radius:8px;background-color:#ebebeb;"></div>`;
    return `
<tr><td style="padding:0 0 12px 0;">
  <a href="${SITE_URL}${l.path}" style="text-decoration:none;color:inherit;display:block;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebeb;border-radius:12px;">
    <tr>
      <td width="96" style="padding:8px;vertical-align:middle;">${photo}</td>
      <td style="padding:8px 12px 8px 4px;vertical-align:middle;font-family:${FONT};">
        <div style="font-size:15px;line-height:1.35;font-weight:600;color:#222222;">${escapeHtml(l.title)}</div>
        <div style="font-size:13px;line-height:1.5;color:#717171;padding-top:2px;">${meta}</div>
        <div style="font-size:13px;line-height:1.5;color:#222222;padding-top:2px;">${price}</div>
      </td>
    </tr>
  </table></a>
</td></tr>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
}

export async function sendNoReplyNudgeEmail({
  email,
  preferredLanguage,
  firstName,
  hostFirstName,
  listingTitle,
  place,
  placePath,
  conversationPath,
  suggestions,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  hostFirstName: string;
  listingTitle: string;
  /** Avec sa préposition : « à Mille-Isles », « dans les Laurentides » */
  place: string;
  placePath: string;
  conversationPath: string;
  suggestions: NudgeSuggestion[];
}): Promise<{ error: Error | null }> {
  const lang = preferredLanguage;
  // Prénoms et titre bruts : le résolveur les échappe (données saisies par les utilisateurs).
  const text = await resolveEmailText(TEMPLATE_NO_REPLY_NUDGE, lang, {
    prenom: firstName?.trim(),
    prenomProprio: hostFirstName,
    titreChalet: listingTitle,
    lieu: place,
  });
  const html = renderEmail({
    lang,
    ...text,
    extraHtml: suggestionCards(suggestions, lang),
    buttonUrl: `${SITE_URL}${placePath}`,
    secondaryButtonLabel: CONVERSATION_BUTTON[lang],
    secondaryButtonUrl: `${SITE_URL}${conversationPath}`,
  });
  const { error } = await sendEmail({ from: FROM, to: [email], subject: text.subject, html });
  return { error: error ? new Error(error.message) : null };
}
