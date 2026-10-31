import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";

// Notification interne à Simon : des relances brouillon (J+3 ou J+10) sont dues. Les relances sont envoyées à la main
// depuis Admin → Brouillons : ce courriel dit lesquelles. Envoyé par le cron send-invitations (8 h, heure de Montréal),
// une seule fois par adresse et par relance (draft_invitation_notes). Même gabarit que launchOfferEnding.ts.

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

export type DueDraftReminder = { email: string; kind: "draft_reminder_3" | "draft_reminder_10"; titles: string[] };

const KIND_LABEL = { draft_reminder_3: "relance J+3", draft_reminder_10: "relance J+10 (dernier courriel)" } as const;

export async function sendDraftRemindersDueNotice(items: DueDraftReminder[]): Promise<{ error: Error | null }> {
  const n = items.length;
  const lines = items.map((it) => {
    const titles = it.titles.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 70)).join(", ");
    return `• <strong>${escapeHtml(it.email)}</strong> — ${KIND_LABEL[it.kind]}${titles ? `<br/>&nbsp;&nbsp;${escapeHtml(titles)}` : ""}`;
  });

  const html = renderEmail({
    lang: "fr",
    heading: n > 1 ? `${n} relances brouillon à envoyer` : "1 relance brouillon à envoyer",
    body:
      `${n > 1 ? "Ces propriétaires n’ont activé aucune de leurs fiches" : "Ce propriétaire n’a activé aucune de ses fiches"} depuis votre invitation.<br/><br/>` +
      `${lines.join("<br/><br/>")}<br/><br/>` +
      "Rien ne part tout seul : ouvrez la page Brouillons, vérifiez le courriel et cliquez sur « Envoyer la relance ».",
    buttonLabel: "Ouvrir Brouillons",
    buttonUrl: `${SITE_URL}/admin/brouillons`,
    footerNote: "Notification automatique, une seule fois par relance.",
  });

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: n > 1 ? `${n} relances brouillon à envoyer sur Kabanalouer` : "1 relance brouillon à envoyer sur Kabanalouer",
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
