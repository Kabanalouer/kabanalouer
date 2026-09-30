// Notification interne à Simon (admin) qu'un nouveau message de contact est
// arrivé via /contact. Toujours en français, un seul destinataire — même
// pattern que sendImportReviewNotification (lib/emails/importNotification.ts).
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

export async function sendContactMessageNotification({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}): Promise<{ error: Error | null }> {
  // Contenu saisi par un visiteur non authentifié — jamais interpolé tel
  // quel dans le HTML (voir lib/escapeHtml.ts).
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  const html = renderEmail({
    lang: "fr",
    heading: "Nouveau message de contact",
    body: `<strong>${safeName}</strong> (${safeEmail}) a envoyé un message via le formulaire de contact.<br/><br/>${safeMessage}`,
    buttonLabel: "Voir les messages",
    buttonUrl: `${SITE_URL}/admin/messages`,
    footerNote: "Notification automatique — file complète dans /admin/messages.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Nouveau message de contact — ${name}`,
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
