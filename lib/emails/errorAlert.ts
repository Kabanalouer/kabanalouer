import { Resend } from "resend";

// Alerte interne : une nouvelle erreur est apparue sur le site, ou une erreur
// marquée comme réglée est revenue (lib/errorTracking.ts). Texte brut, en
// français, un seul destinataire — même pattern que importNotification.ts.

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";
const ADMIN_URL = "https://kabanalouer.ca/admin/erreurs";

export async function sendErrorAlert({
  source,
  message,
  path,
}: {
  source: "client" | "server";
  message: string;
  path: string | null;
}): Promise<{ error: Error | null }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const where = source === "client" ? "dans le navigateur d’un visiteur" : "sur le serveur";
  const short = message.replace(/\s+/g, " ").slice(0, 80);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Nouvelle erreur sur Kabanalouer : ${short}`,
    text: [
      `Une nouvelle erreur est apparue ${where}.`,
      "",
      `Message : ${message}`,
      path ? `Page : ${path}` : null,
      "",
      `Détails et historique : ${ADMIN_URL}`,
      "",
      "Tu reçois au plus 10 alertes par heure. Une erreur marquée « Réglée » qui revient déclenche une nouvelle alerte.",
    ].filter((l) => l !== null).join("\n"),
  });
  return { error: error ? new Error(error.message) : null };
}
