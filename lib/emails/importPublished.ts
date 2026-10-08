// Courriel de bienvenue envoyé au propriétaire quand un admin publie une
// annonce importée en son nom (voir app/api/admin/listings/[id]/publish).
// Distinct de welcomeSubscription.ts, qui invite à compléter/publier — ici,
// l'annonce est déjà en ligne, le lien pointe directement vers la fiche
// publique.
// Textes modifiables dans Admin → Séquences courriel (TEMPLATE_* ci-dessous =
// textes par défaut, lib/emailTemplates).
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/escapeHtml";
import { resolveEmailText } from "@/lib/emailTemplates/resolve";
import type { EmailTemplateDef } from "@/lib/emailTemplates/types";

const FROM = "Kabanalouer <info@kabanalouer.ca>";

export const TEMPLATE_IMPORT_PUBLISHED: EmailTemplateDef = {
  id: "import-published",
  placeholders: [
    { key: "prenom", label: "Prénom du proprio" },
    { key: "titreChalet", label: "Titre du chalet" },
    {
      key: "anneeGratuite",
      label: "Bout de phrase « , et ta première année d’accès est gratuite » (vide si l’offre de lancement ne s’applique pas)",
      html: true,
    },
  ],
  defaults: {
    fr: {
      subject: "{prenom}, ton annonce Kabanalouer est en ligne !",
      greeting: "Bonjour {prenom} !",
      heading: "Ton annonce est en ligne !",
      body: "Bonne nouvelle : {titreChalet} est maintenant publiée sur Kabanalouer{anneeGratuite}. Les voyageurs peuvent dès maintenant te contacter directement.",
      buttonLabel: "Voir mon annonce",
      footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
    },
    en: {
      subject: "{prenom}, your Kabanalouer listing is live!",
      greeting: "Hi {prenom}!",
      heading: "Your listing is live!",
      body: "Good news: {titreChalet} is now published on Kabanalouer{anneeGratuite}. Travelers can now contact you directly.",
      buttonLabel: "View my listing",
      footerNote: "Got a question? Just reply to this email — we're happy to help.",
    },
  },
};

// Objet sans prénom : « , ton annonce… » → « Ton annonce… ».
function tidySubject(subject: string): string {
  const s = subject.replace(/^[\s,]+/, "").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function sendImportPublishedEmail({
  email,
  preferredLanguage,
  firstName,
  listingPath,
  listingTitle,
  isFreeLaunch,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
  firstName?: string | null;
  listingPath: string;
  listingTitle: string;
  isFreeLaunch: boolean;
}): Promise<{ error: Error | null }> {
  // Offre de lancement : mention de la première année gratuite.
  const freeYear = isFreeLaunch
    ? preferredLanguage === "fr"
      ? ", et ta première année d'accès est gratuite"
      : ", and your first year of access is free"
    : "";

  const text = await resolveEmailText(TEMPLATE_IMPORT_PUBLISHED, preferredLanguage, {
    prenom: firstName?.trim(),
    titreChalet: listingTitle,
    anneeGratuite: escapeHtml(freeYear),
  });

  const html = renderEmail({
    lang: preferredLanguage,
    ...text,
    buttonUrl: `${SITE_URL}${listingPath}`,
  });

  const { error } = await sendEmail({
    from: FROM,
    to: [email],
    subject: firstName?.trim() ? text.subject : tidySubject(text.subject),
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
