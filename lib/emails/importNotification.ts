// Notification interne à Simon (admin) qu'une annonce a été importée — pour
// info : le proprio la complète et la publie lui-même. Toujours en français, un seul destinataire — pas de logique
// bilingue comme les courriels envoyés aux proprios/voyageurs.
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

export async function sendImportReviewNotification({
  listingId,
  listingTitle,
  platform,
  hostName,
}: {
  listingId: string;
  listingTitle: string;
  platform: "airbnb" | "vrbo";
  hostName: string;
}): Promise<{ error: Error | null }> {
  // Construction paresseuse — jamais au chargement du module : sinon une
  // clé absente/invalide ferait
  // planter tout module qui importe ce fichier, y compris le pipeline
  // d'import Airbnb qui ne devrait jamais échouer pour une notification.
  if (!process.env.RESEND_API_KEY) {
    return { error: new Error("RESEND_API_KEY manquant — notification non envoyée") };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const platformLabel = platform === "airbnb" ? "Airbnb" : "VRBO";
  const reviewUrl = `${SITE_URL}/dashboard/listings/${listingId}/edit`;

  const html = renderEmail({
    lang: "fr",
    heading: "Nouvelle annonce importée",
    body: `${escapeHtml(listingTitle)}, importée depuis ${platformLabel} par ${escapeHtml(hostName)}. Le proprio la complète et la publie lui-même — pour info, si tu veux y jeter un œil.`,
    buttonLabel: "Voir l'annonce",
    buttonUrl: reviewUrl,
    footerNote: "Notification automatique — imports pas encore publiés dans /admin/imports.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Nouvelle annonce importée — ${listingTitle}`,
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
