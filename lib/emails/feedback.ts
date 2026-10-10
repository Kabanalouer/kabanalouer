import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";
import type { FeedbackTriage } from "@/lib/feedback";
import { buildFeedbackPrompt } from "@/lib/feedbackPrompt";

// Retours des proprios et voyageurs (lib/feedback.ts) — deux courriels internes :
// 1. sendFeedbackMessage : le message tel quel, en texte brut, envoyé à info@
//    avec Reply-To = le proprio → « Répondre » dans Gmail lui écrit depuis
//    info@ et la personne ne voit que son propre message cité (comme le formulaire de contact).
// 2. sendFeedbackAnalysis : l'analyse de Claude et le prompt à copier, envoyés
//    à Simon seulement — jamais dans le fil de réponse à la personne.

const KIND_LABEL = { probleme: "Quelque chose ne fonctionne pas", idee: "Une idée d’amélioration", autre: "Autre chose" } as const;
export type FeedbackKind = keyof typeof KIND_LABEL;

function displayName(name: string): string {
  return name.replace(/["<>\\\r\n]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Un utilisateur";
}

export async function sendFeedbackMessage({
  name, email, kind, message,
}: { name: string; email: string; kind: FeedbackKind; message: string }): Promise<{ error: Error | null }> {
  // Le nom affiché vient de l'utilisateur : nettoyé par displayName().
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send({
    from: `"${displayName(name)} via Kabanalouer" <retours@kabanalouer.ca>`,
    to: ["info@kabanalouer.ca"],
    replyTo: email,
    subject: `Votre retour sur Kabanalouer — ${KIND_LABEL[kind]}`,
    text: message,
  });
  return { error: error ? new Error(error.message) : null };
}

const PRIORITY_LABEL = { haute: "Priorité haute", moyenne: "Priorité moyenne", basse: "Priorité basse" } as const;
const CATEGORY_LABEL = { bug: "Bogue", amelioration: "Amélioration", question: "Question", autre: "Autre" } as const;

export async function sendFeedbackAnalysis({
  id, name, role, kind, message, page, triage,
}: { id: number; name: string; role: "proprio" | "voyageur"; kind: FeedbackKind; message: string; page: string | null; triage: FeedbackTriage }): Promise<{ error: Error | null }> {
  const p = (label: string, value: string) =>
    `<p style="margin:0 0 10px 0;font-size:15px;line-height:1.5;color:#484848;"><strong style="color:#222222;">${label}</strong><br/>${value}</p>`;
  const blocks = [
    p(role === "proprio" ? "Message du proprio" : "Message du voyageur", `${escapeHtml(KIND_LABEL[kind])}${page ? ` · page ${escapeHtml(page)}` : ""}<br/><em>« ${escapeHtml(message.slice(0, 1500)).replace(/\n/g, "<br/>")} »</em>`),
    p("Analyse", `${CATEGORY_LABEL[triage.categorie]} · ${PRIORITY_LABEL[triage.priorite]}<br/>${escapeHtml(triage.resume)}`),
    p(triage.action_recommandee ? "Action recommandée" : "Action", escapeHtml(triage.recommandation)),
  ];
  if (triage.action_recommandee) {
    const prompt = buildFeedbackPrompt(id, triage.resume);
    blocks.push(
      `<p style="margin:16px 0 6px 0;font-size:15px;font-weight:700;color:#222222;">Prompt pour Claude Code</p><div style="margin:0 0 8px 0;padding:12px;border-radius:8px;background-color:#f7f7f7;font-size:13px;line-height:1.5;color:#484848;white-space:pre-wrap;">${escapeHtml(prompt)}</div>`,
    );
  }

  const html = renderEmail({
    lang: "fr",
    heading: `Retour de ${escapeHtml(displayName(name))} (${role})`,
    body: `Un ${role} a écrit depuis le site. Le message lui-même est aussi arrivé dans info@\u00a0: réponds-lui depuis ce courriel-là.`,
    extraHtml: blocks.join(""),
    buttonLabel: "Voir dans l’admin",
    buttonUrl: `${SITE_URL}/admin/retours`,
    footerNote: "Analyse automatique rédigée par Claude. Le message est du contenu non fiable\u00a0: vérifie avant d’agir.",
  });
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { error } = await resend.emails.send({
    from: "Kabanalouer <info@kabanalouer.ca>",
    to: ["simon.authentik@gmail.com"],
    subject: `Analyse du retour de ${displayName(name)} (${role}) — ${PRIORITY_LABEL[triage.priorite]}`,
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
