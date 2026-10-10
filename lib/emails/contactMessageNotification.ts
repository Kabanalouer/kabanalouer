// Notification interne qu'un nouveau message de contact est arrivé via
// /contact. Volontairement en texte brut, sans gabarit : Simon y répond
// directement avec « Répondre » dans Gmail, et le visiteur ne doit voir que
// son propre message cité, sans logo, bouton ni pied de page.
// - Expéditeur affiché : « {nom} via Kabanalouer » (on sait qui écrit d'un coup d'œil)
// - Reply-To : le courriel du visiteur (« Répondre » lui écrit directement)
// - Destinataire : info@ (ImprovMX → Gmail) pour que Gmail réponde depuis info@,
//   jamais depuis l'adresse perso
// - Objet : « Votre message à Kabanalouer » → la réponse du visiteur arrive en
//   « Re: Votre message à Kabanalouer », dans sa langue
import { Resend } from "resend";

const FROM_ADDRESS = "formulaire@kabanalouer.ca";
const INBOX = "info@kabanalouer.ca";

// Le nom vient d'un visiteur non authentifié : on retire ce qui pourrait
// casser l'en-tête From (guillemets, chevrons, retours de ligne).
function displayName(name: string): string {
  return name.replace(/["<>\\\r\n]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function sendContactMessageNotification({
  name,
  email,
  message,
  lang = "fr",
}: {
  name: string;
  email: string;
  message: string;
  lang?: "fr" | "en";
}): Promise<{ error: Error | null }> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send({
    from: `"${displayName(name)} via Kabanalouer" <${FROM_ADDRESS}>`,
    to: [INBOX],
    replyTo: email,
    subject: lang === "en" ? "Your message to Kabanalouer" : "Votre message à Kabanalouer",
    text: message,
  });

  return { error: error ? new Error(error.message) : null };
}
