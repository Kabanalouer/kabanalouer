import twilio from "twilio";
import { SITE_URL } from "@/lib/siteUrl";
import { normalizePhone } from "@/lib/phone";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// null tant que les 3 variables Twilio ne sont pas configurées (ex. en local
// avant que Simon les ajoute, ou en preview Vercel) — sendNewMessageSms()
// retourne alors une erreur explicite plutôt que de planter.
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendNewMessageSms({
  to,
  senderFirstName,
  preferredLanguage,
  isQuoteRequest = false,
}: {
  to: string;
  senderFirstName: string;
  preferredLanguage: "fr" | "en";
  isQuoteRequest?: boolean;
}): Promise<{ error: Error | null }> {
  if (!client || !fromNumber) {
    return { error: new Error("Twilio non configuré (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER manquants).") };
  }

  const phone = normalizePhone(to);
  if (!phone) return { error: new Error("Numéro de cellulaire invalide.") };

  const en = preferredLanguage === "en";
  const what = isQuoteRequest
    ? (en ? "New price request" : "Nouvelle demande de prix")
    : (en ? "New message" : "Nouveau message");
  const body = en
    ? `${what} on Kabanalouer from ${senderFirstName}. Reply here: ${SITE_URL}/en/messages`
    : `${what} sur Kabanalouer de ${senderFirstName}. Réponds ici : ${SITE_URL}/messages`;

  try {
    await client.messages.create({ to: phone, from: fromNumber, body });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
