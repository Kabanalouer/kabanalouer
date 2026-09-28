import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { escapeHtml } from "@/lib/escapeHtml";
import { renderEmail } from "./renderEmail";
import { PRIX_VEDETTE_HOME, PRIX_VEDETTE_REGION } from "@/lib/featuredConfig";

// Courriels d'accueil des nouveaux proprios, envoyés par le cron
// host-onboarding-emails après la première publication :
// - 48 h : invitation à booster l'annonce (vedette région / accueil)
// - 96 h : guide pour installer l'app et activer les notifications de messages

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

export async function sendInstallAppGuideEmail({
  email, lang, firstName, hasPhone,
}: {
  email: string; lang: Lang; firstName?: string | null; hasPhone: boolean;
}): Promise<{ error: Error | null }> {
  const name = firstName?.trim();
  const fr = lang === "fr";
  const profilePath = `${fr ? "" : "/en"}/dashboard/profile#notifications-appareil`;

  const iphone = fr
    ? steps([
        "Ouvre <strong>kabanalouer.ca</strong> dans <strong>Safari</strong> (la boussole bleue).",
        "Touche le bouton <strong>Partager</strong> (le carré avec une flèche vers le haut). Sur les iPhone récents, touche d’abord <strong>⋯</strong> en bas à droite.",
        "Fais défiler le menu <strong>jusqu’en bas</strong> et choisis <strong>«&nbsp;Sur l’écran d’accueil&nbsp;»</strong>, puis <strong>Ajouter</strong>.",
        "Ouvre Kabanalouer <strong>depuis la nouvelle icône</strong>, va dans ton profil et active <strong>«&nbsp;Notifications sur ce téléphone&nbsp;»</strong>.",
      ])
    : steps([
        "Open <strong>kabanalouer.ca</strong> in <strong>Safari</strong> (the blue compass).",
        "Tap <strong>Share</strong> (the square with an arrow pointing up). On recent iPhones, tap <strong>⋯</strong> at the bottom right first.",
        "Scroll the menu <strong>all the way down</strong>, choose <strong>“Add to Home Screen”</strong>, then <strong>Add</strong>.",
        "Open Kabanalouer <strong>from the new icon</strong>, go to your profile and turn on <strong>“Notifications on this device”</strong>.",
      ]);
  const android = fr
    ? steps([
        "Ouvre <strong>kabanalouer.ca</strong> dans <strong>Chrome</strong>.",
        "Touche le menu <strong>⋮</strong> en haut à droite, puis <strong>«&nbsp;Installer l’application&nbsp;»</strong>.",
        "Ouvre Kabanalouer depuis l’icône, va dans ton profil et active <strong>«&nbsp;Notifications sur ce téléphone&nbsp;»</strong>.",
      ])
    : steps([
        "Open <strong>kabanalouer.ca</strong> in <strong>Chrome</strong>.",
        "Tap the <strong>⋮</strong> menu at the top right, then <strong>“Install app”</strong>.",
        "Open Kabanalouer from the icon, go to your profile and turn on <strong>“Notifications on this device”</strong>.",
      ]);

  const sms = hasPhone
    ? (fr
        ? "Tu reçois déjà un texto à chaque nouveau message, puisque ton numéro de cellulaire est dans ton profil."
        : "You already get a text for every new message, since your cell number is in your profile.")
    : (fr
        ? "<strong>Plus simple encore :</strong> ajoute ton numéro de cellulaire dans ton profil pour recevoir un texto à chaque nouveau message, sans rien installer."
        : "<strong>Even simpler:</strong> add your cell number in your profile to get a text for every new message, with nothing to install.");

  const h = (t: string) => `<p style="margin:20px 0 4px 0;font-size:16px;font-weight:700;color:#222222;">${t}</p>`;
  const body = fr
    ? `Un voyageur qui attend une réponse va souvent voir ailleurs. Répondre en moins de 24&nbsp;h aide aussi ton annonce à mieux se classer.<br/><br/>Installe Kabanalouer sur ton téléphone pour recevoir une notification dès qu’un voyageur t’écrit — gratuit, rien à télécharger dans une boutique d’applications.${h("Sur iPhone")}${iphone}${h("Sur Android")}${android}${sms}`
    : `A traveler waiting for an answer often looks elsewhere. Replying within 24 hours also helps your listing rank higher.<br/><br/>Install Kabanalouer on your phone to get a notification as soon as a traveler writes to you — free, nothing to download from an app store.${h("On iPhone")}${iphone}${h("On Android")}${android}${sms}`;

  const html = renderEmail({
    lang,
    greeting: name ? (fr ? `Bonjour ${escapeHtml(name)} !` : `Hi ${escapeHtml(name)}!`) : undefined,
    heading: fr ? "Ne manque plus aucun message" : "Never miss a message",
    body,
    buttonLabel: fr ? "Activer mes notifications" : "Turn on my notifications",
    buttonUrl: `${SITE_URL}${profilePath}`,
    footerNote: fr
      ? "Besoin d’aide pour l’installer ? Réponds à ce courriel, on va t’aider avec plaisir."
      : "Need help installing it? Just reply to this email — we’re happy to help.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: fr ? "Reçois une notification à chaque nouveau message" : "Get notified for every new message",
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
