// Notification interne à Simon (admin) : une annonce vient d'être publiée
// avec un numéro CITQ déjà utilisé par une annonce d'un autre compte
// (voir lib/citqDuplicates.ts). Toujours en français, un seul destinataire.
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

export async function sendCitqDuplicateAlert({
  citq,
  listingId,
  listingTitle,
  others,
}: {
  citq: string;
  listingId: string;
  listingTitle: string;
  others: { id: string; title: string | null }[];
}): Promise<{ error: Error | null }> {
  if (!process.env.RESEND_API_KEY) {
    return { error: new Error("RESEND_API_KEY manquant — alerte non envoyée") };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const list = others
    .map((o) => `• <a href="${SITE_URL}/dashboard/listings/${o.id}/edit" style="color:#4d5631;">${escapeHtml(o.title || "Annonce sans titre")}</a>`)
    .join("<br/>");

  const html = renderEmail({
    lang: "fr",
    heading: "Numéro CITQ en double",
    body: `L’annonce «&nbsp;${escapeHtml(listingTitle)}&nbsp;» vient d’être publiée avec le numéro CITQ <strong>${escapeHtml(citq)}</strong>, déjà utilisé par une annonce d’un autre compte&nbsp;:<br/><br/>${list}<br/><br/>Ça peut être normal (plusieurs unités d’un même établissement) ou un doublon. La publication n’a pas été bloquée.`,
    buttonLabel: "Voir la nouvelle annonce",
    buttonUrl: `${SITE_URL}/dashboard/listings/${listingId}/edit`,
    footerNote: "Notification automatique — vérification des doublons à la publication.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Numéro CITQ en double — ${listingTitle}`,
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
