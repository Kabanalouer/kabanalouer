import { Resend } from "resend";
import { SITE_URL } from "@/lib/siteUrl";
import { renderEmail } from "./renderEmail";
import { escapeHtml } from "@/lib/escapeHtml";
import type { WeeklyReport } from "@/lib/weeklyReport";
import { buildReportPrompts } from "@/lib/weeklyReportPrompts";

// Rapport du lundi envoyé à Simon (lib/weeklyReport.ts). Interne, en français.

const FROM = "Kabanalouer <info@kabanalouer.ca>";
const ADMIN_EMAIL = "simon.authentik@gmail.com";

const h = (s: string) => `<p style="margin:20px 0 8px 0;font-size:16px;font-weight:700;color:#222222;">${s}</p>`;
const item = (title: string, lines: string[]) =>
  `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:#484848;"><strong style="color:#222222;">${escapeHtml(title)}</strong><br/>${lines.map(escapeHtml).join("<br/>")}</p>`;

export async function sendWeeklyReportEmail(report: WeeklyReport, reportId: number): Promise<{ error: Error | null }> {
  const blocks: string[] = [];
  if (report.problemes.length) {
    blocks.push(h("Ce qui coince"));
    for (const p of report.problemes) blocks.push(item(p.titre, [p.preuve]));
  }
  if (report.recommandations.length) {
    blocks.push(h("À faire cette semaine"));
    report.recommandations.forEach((r, i) => blocks.push(item(`${i + 1}. ${r.titre}`, [r.pourquoi, `→ ${r.action}`, `Impact ${r.impact} · effort ${r.effort}`])));
  }
  if (report.erreurs.length) {
    blocks.push(h("Erreurs à trancher"));
    for (const e of report.erreurs) blocks.push(item(e.message.slice(0, 120), [e.diagnostic, `Action proposée : ${e.action}`]));
  }
  const date = new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto" });
  const prompts = buildReportPrompts(report, date, reportId);
  if (prompts.length) {
    blocks.push(h("Prompts pour Claude Code"));
    blocks.push(`<p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#717171;">Copie un prompt et colle-le dans Claude Code pour qu’il s’en charge (bouton « Copier » dans l’admin).</p>`);
    for (const p of prompts) {
      blocks.push(`<p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#222222;">${escapeHtml(p.titre)}</p><div style="margin:0 0 16px 0;padding:12px;border-radius:8px;background-color:#f7f7f7;font-size:13px;line-height:1.5;color:#484848;white-space:pre-wrap;">${escapeHtml(p.prompt)}</div>`);
    }
  }
  if (report.suivi) {
    blocks.push(h("Suivi de la semaine dernière"));
    blocks.push(`<p style="margin:0;font-size:15px;line-height:1.5;color:#484848;">${escapeHtml(report.suivi)}</p>`);
  }

  const html = renderEmail({
    lang: "fr",
    heading: "Ton rapport du lundi",
    body: escapeHtml(report.resume),
    extraHtml: blocks.join(""),
    buttonLabel: "Voir le rapport dans l’admin",
    buttonUrl: `${SITE_URL}/admin/rapports`,
    footerNote: "Rapport automatique, rédigé par Claude à partir des chiffres de Santé de la plateforme et des erreurs de la semaine.",
  });

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const subjectDate = new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", timeZone: "America/Toronto" });
  const { error } = await resend.emails.send({ from: FROM, to: [ADMIN_EMAIL], subject: `Rapport du lundi — ${subjectDate}`, html });
  return { error: error ? new Error(error.message) : null };
}
