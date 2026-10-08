import { Resend } from "resend";
import { emailContext } from "./emailContext";

// Point d'envoi unique des courriels proprio et voyageur. Dans l'aperçu de
// l'éditeur de textes (emailContext.capture), le courriel est capturé au lieu
// d'être envoyé. Même forme de retour que resend.emails.send.

let resend: Resend | null = null;

export async function sendEmail(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ error: { message: string } | null }> {
  const capture = emailContext.getStore()?.capture;
  if (capture) {
    capture({ subject: payload.subject, html: payload.html });
    return { error: null };
  }
  resend ??= new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send(payload);
  return { error: error ? { message: error.message } : null };
}
