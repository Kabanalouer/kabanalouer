// Notification interne à Simon (admin) qu'une annonce importée attend sa
// révision. Toujours en français, un seul destinataire — pas de logique
// bilingue comme les courriels envoyés aux proprios/voyageurs.
import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

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
  const platformLabel = platform === "airbnb" ? "Airbnb" : "VRBO";
  const reviewUrl = `${SITE_URL}/dashboard/listings/${listingId}/edit`;

  const html = renderEmail({
    lang: "fr",
    heading: "Nouvelle annonce importée à réviser",
    body: `${listingTitle}, importée depuis ${platformLabel} par ${hostName}, attend ta révision avant publication.`,
    buttonLabel: "Réviser l'annonce",
    buttonUrl: reviewUrl,
    footerNote: "Notification automatique — file d'attente complète dans /admin/imports.",
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Nouvelle annonce importée à réviser — ${listingTitle}`,
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
