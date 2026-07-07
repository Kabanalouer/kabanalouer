import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "Kabanalouer <info@kabanalouer.ca>";

function renderEmail({
  lang,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  footerNote,
}: {
  lang: "fr" | "en";
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  footerNote: string;
}) {
  return `<!DOCTYPE html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background-color:#f5f6ec;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <span style="font-size:20px;font-weight:700;color:#636e40;">Kabanalouer</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#292524;">${heading}</h1>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#57534e;">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;text-align:center;">
                <a href="${buttonUrl}" style="display:inline-block;background-color:#636e40;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:9999px;">${buttonLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">${footerNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const TEMPLATES: Record<"fr" | "en", {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonPath: string;
  footerNote: string;
}> = {
  fr: {
    subject: "Bienvenue proprio ! Ton abonnement Kabanalouer est actif",
    heading: "Ton abonnement est actif !",
    body: "Merci de faire confiance à Kabanalouer. Ton abonnement annuel est maintenant actif — si ce n'est pas déjà fait, complète et publie ton annonce pour commencer à recevoir des demandes de voyageurs.",
    buttonLabel: "Compléter mon annonce",
    buttonPath: "/dashboard/listings",
    footerNote: "Une question ? Réponds directement à ce courriel, on va te répondre avec plaisir.",
  },
  en: {
    subject: "Welcome, owner! Your Kabanalouer subscription is active",
    heading: "Your subscription is active!",
    body: "Thanks for trusting Kabanalouer. Your annual subscription is now active — if you haven't already, complete and publish your listing to start receiving requests from travelers.",
    buttonLabel: "Complete my listing",
    buttonPath: "/en/dashboard/listings",
    footerNote: "Got a question? Just reply to this email — we're happy to help.",
  },
};

export async function sendWelcomeSubscriptionEmail({
  email,
  preferredLanguage,
}: {
  email: string;
  preferredLanguage: "fr" | "en";
}): Promise<{ error: Error | null }> {
  const template = TEMPLATES[preferredLanguage];
  const html = renderEmail({
    lang: preferredLanguage,
    heading: template.heading,
    body: template.body,
    buttonLabel: template.buttonLabel,
    buttonUrl: `${SITE_URL}${template.buttonPath}`,
    footerNote: template.footerNote,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: template.subject,
    html,
  });

  return { error: error ? new Error(error.message) : null };
}
