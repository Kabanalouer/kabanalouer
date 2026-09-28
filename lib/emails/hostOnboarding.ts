import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { escapeHtml } from "@/lib/escapeHtml";
import { renderEmail } from "./renderEmail";
import { PRIX_VEDETTE_HOME, PRIX_VEDETTE_REGION } from "@/lib/featuredConfig";

// Courriels d'accueil des nouveaux proprios, envoyés par le cron
// host-onboarding-emails après la première publication :
// - 48 h : invitation à booster l'annonce (vedette région / accueil)
// - 96 h : invitation à recevoir les demandes et messages par texto

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "Kabanalouer <info@kabanalouer.ca>";

type Lang = "fr" | "en";

const step = (n: number, html: string) =>
  `<tr><td style="vertical-align:top;padding:0 10px 10px 0;"><span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:9999px;background-color:#e8ebdc;color:#636e40;font-size:12px;font-weight:700;text-align:center;">${n}</span></td><td style="padding:0 0 10px 0;font-size:16px;line-height:1.5;color:#484848;">${html}</td></tr>`;

const steps = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px 0;">${items.map((s, i) => step(i + 1, s)).join("")}</table>`;

export async function sendBoostInviteEmail({
  email, lang, firstName, listingTitle, listingId,
}: {
  email: string; lang: Lang; firstName?: string | null; listingTitle: string; listingId: string;
}): Promise<{ error: Error | null }> {
  const name = firstName?.trim();
  const title = escapeHtml(listingTitle);
  const path = `${lang === "en" ? "/en" : ""}/dashboard/listings/${listingId}/edit?section=vedette`;
  const fr = lang === "fr";

  const html = renderEmail({
    lang,
    greeting: name ? (fr ? `Bonjour ${escapeHtml(name)} !` : `Hi ${escapeHtml(name)}!`) : undefined,
    heading: fr ? "Donne un coup de pouce à ton chalet" : "Give your cabin a boost",
    body: fr
      ? `${title} est en ligne depuis quelques jours — bravo !<br/><br/>Pour être vu par plus de voyageurs, tu peux le mettre en vedette&nbsp;: en tête de sa page région (${PRIX_VEDETTE_REGION}&nbsp;$/mois) ou sur la page d’accueil de Kabanalouer (${PRIX_VEDETTE_HOME}&nbsp;$/mois). Les places sont limitées chaque mois.`
      : `${title} has been live for a few days — congratulations!<br/><br/>To reach more travelers, you can feature it: at the top of its region page ($${PRIX_VEDETTE_REGION}/month) or on the Kabanalouer home page ($${PRIX_VEDETTE_HOME}/month). Spots are limited each month.`,
    buttonLabel: fr ? "Booster mon annonce" : "Boost my listing",
    buttonUrl: `${SITE_URL}${path}`,
    footerNote: fr
      ? "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir."
      : "Got a question? Just reply to this email — we’re happy to help.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: fr ? `Fais voir ${listingTitle} à plus de voyageurs` : `Get ${listingTitle} seen by more travelers`,
    html,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function sendSmsInviteEmail({
  email, lang, firstName,
}: {
  email: string; lang: Lang; firstName?: string | null;
}): Promise<{ error: Error | null }> {
  const name = firstName?.trim();
  const fr = lang === "fr";
  const profilePath = `${fr ? "" : "/en"}/dashboard/profile#phone`;

  const howTo = fr
    ? steps([
        "Ouvre ton profil avec le bouton ci-dessous.",
        "Dans <strong>Notifications</strong>, active <strong>«&nbsp;Par texto&nbsp;»</strong>.",
        "Entre ton numéro de cellulaire. C’est tout&nbsp;!",
      ])
    : steps([
        "Open your profile with the button below.",
        "Under <strong>Notifications</strong>, turn on <strong>“By text message”</strong>.",
        "Enter your cell phone number. That’s it!",
      ]);

  const body = fr
    ? `Un voyageur qui attend une réponse va souvent voir ailleurs. Répondre en moins de 24&nbsp;h aide aussi ton annonce à mieux se classer.<br/><br/>Reçois un texto pour chaque nouvelle demande de prix ou nouveau message, avec un lien pour répondre tout de suite. Rien à installer.${howTo}`
    : `A traveler waiting for an answer often looks elsewhere. Replying within 24 hours also helps your listing rank higher.<br/><br/>Get a text for every new price request or message, with a link to reply right away. Nothing to install.${howTo}`;

  const html = renderEmail({
    lang,
    greeting: name ? (fr ? `Bonjour ${escapeHtml(name)} !` : `Hi ${escapeHtml(name)}!`) : undefined,
    heading: fr ? "Reçois tes demandes par texto" : "Get your requests by text",
    body,
    buttonLabel: fr ? "Activer les textos" : "Turn on text messages",
    buttonUrl: `${SITE_URL}${profilePath}`,
    footerNote: fr
      ? "Tu continues de recevoir les courriels aussi. Tu peux régler les deux dans ton profil."
      : "You’ll keep getting emails too. You can adjust both in your profile.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: fr ? "Reçois tes demandes de prix par texto" : "Get your price requests by text",
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
