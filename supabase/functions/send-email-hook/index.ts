import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")!.replace("v1,whsec_", "");
const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FROM = "Kabanalouer <no-reply@kabanalouer.ca>";

interface HookPayload {
  user: { id: string; email: string };
  email_data: {
    token_hash: string;
    email_action_type: string;
    redirect_to: string;
  };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildActionLink(tokenHash: string, actionType: string, redirectTo: string) {
  const base = Deno.env.get("SUPABASE_URL")!;
  const params = new URLSearchParams({ token: tokenHash, type: actionType, redirect_to: redirectTo });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

// ── Gabarit HTML partagé ───────────────────────────────────────────────────
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

// ── Contenu par type d'action et langue ────────────────────────────────────
const TEMPLATES: Record<"signup" | "recovery", Record<"fr" | "en", {
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string;
  footerNote: string;
}>> = {
  signup: {
    fr: {
      subject: "Confirme ton compte Kabanalouer",
      heading: "Bienvenue chez Kabanalouer !",
      body: "Clique sur le bouton ci-dessous pour confirmer la création de ton compte et commencer à explorer les chalets du Québec.",
      buttonLabel: "Confirmer mon compte",
      footerNote: "Si tu n'as pas créé de compte sur Kabanalouer, tu peux ignorer ce courriel.",
    },
    en: {
      subject: "Confirm your Kabanalouer account",
      heading: "Welcome to Kabanalouer!",
      body: "Click the button below to confirm your account and start exploring cabins across Québec.",
      buttonLabel: "Confirm my account",
      footerNote: "If you didn't create an account on Kabanalouer, you can safely ignore this email.",
    },
  },
  recovery: {
    fr: {
      subject: "Réinitialise ton mot de passe Kabanalouer",
      heading: "Réinitialisation de mot de passe",
      body: "Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.",
      buttonLabel: "Choisir un nouveau mot de passe",
      footerNote: "Si tu n'es pas à l'origine de cette demande, tu peux ignorer ce courriel — ton mot de passe actuel restera inchangé.",
    },
    en: {
      subject: "Reset your Kabanalouer password",
      heading: "Password reset",
      body: "Click the button below to choose a new password.",
      buttonLabel: "Choose a new password",
      footerNote: "If you didn't request this, you can safely ignore this email — your current password will remain unchanged.",
    },
  },
};

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: HookPayload;
  try {
    const wh = new Webhook(hookSecret);
    verified = wh.verify(payload, headers) as HookPayload;
  } catch (error) {
    console.error("[send-email-hook] signature invalide", error);
    return jsonResponse(
      { error: { http_code: 401, message: "Invalid webhook signature" } },
      401
    );
  }

  const { user, email_data } = verified;
  const { token_hash, email_action_type, redirect_to } = email_data;

  // On ne gère que signup et recovery — les autres types (magiclink, invite,
  // email_change) ne sont pas utilisés dans l'app aujourd'hui. Note : une fois
  // ce hook actif, Supabase n'envoie plus AUCUN email par défaut pour ces
  // autres types (le SMTP interne est désactivé globalement, pas seulement
  // pour signup/recovery) — retourner un succès ici évite juste une erreur
  // côté Supabase, ça ne déclenche pas d'envoi de secours.
  if (email_action_type !== "signup" && email_action_type !== "recovery") {
    return jsonResponse({}, 200);
  }

  let preferredLanguage: "fr" | "en" = "fr";
  try {
    const { data } = await supabaseAdmin
      .from("users")
      .select("preferred_language")
      .eq("id", user.id)
      .single();
    if (data?.preferred_language === "en") preferredLanguage = "en";
  } catch (error) {
    console.error("[send-email-hook] lecture preferred_language échouée, fallback fr", error);
  }

  const template = TEMPLATES[email_action_type as "signup" | "recovery"][preferredLanguage];
  const actionLink = buildActionLink(token_hash, email_action_type, redirect_to);
  const html = renderEmail({
    lang: preferredLanguage,
    heading: template.heading,
    body: template.body,
    buttonLabel: template.buttonLabel,
    buttonUrl: actionLink,
    footerNote: template.footerNote,
  });

  const { error: sendError } = await resend.emails.send({
    from: FROM,
    to: [user.email],
    subject: template.subject,
    html,
  });

  if (sendError) {
    console.error("[send-email-hook] envoi Resend échoué", sendError);
    return jsonResponse(
      { error: { http_code: 500, message: "Failed to send email" } },
      500
    );
  }

  return jsonResponse({}, 200);
});
