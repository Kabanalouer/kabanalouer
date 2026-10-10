import { createClient as createAdminClient } from "@supabase/supabase-js";
import GenerateReportButton from "@/components/admin/GenerateReportButton";
import type { WeeklyReport } from "@/lib/weeklyReport";
import { buildReportPrompts } from "@/lib/weeklyReportPrompts";
import CopyPromptButton from "@/components/admin/CopyPromptButton";

export const metadata = { title: "Rapports — Administration" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Row = { id: number; created_at: string; period_start: string; period_end: string; report: WeeklyReport; model: string };

const LEVEL: Record<string, string> = {
  haute: "bg-warning-50 text-warning-700",
  fort: "bg-success-50 text-success-700",
  moyenne: "bg-charcoal-100 text-charcoal-600",
  moyen: "bg-charcoal-100 text-charcoal-600",
  basse: "bg-charcoal-100 text-charcoal-500",
  faible: "bg-charcoal-100 text-charcoal-500",
};
const ACTION: Record<string, string> = { corriger: "À corriger", ignorer: "À ignorer", surveiller: "À surveiller" };

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto" });

function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL[value] ?? "bg-charcoal-100 text-charcoal-600"}`}>{label ?? value}</span>;
}

function Report({ row }: { row: Row }) {
  const r = row.report;
  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed text-charcoal-700">{r.resume}</p>

      {r.problemes.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-charcoal-800 mb-2">Ce qui coince</h3>
          <ul className="space-y-3">
            {r.problemes.map((p, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2"><Pill value={p.gravite} label={`Gravité ${p.gravite}`} /><span className="font-medium text-charcoal-800">{p.titre}</span></div>
                <p className="mt-1 text-charcoal-600">{p.preuve}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.recommandations.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-charcoal-800 mb-2">À faire cette semaine</h3>
          <ol className="space-y-3">
            {r.recommandations.map((rec, i) => (
              <li key={i} className="rounded-xl bg-charcoal-50 p-4 text-sm">
                <p className="font-semibold text-charcoal-800">{i + 1}. {rec.titre}</p>
                <p className="mt-1 text-charcoal-600">{rec.pourquoi}</p>
                <p className="mt-1 text-charcoal-800">→ {rec.action}</p>
                <div className="mt-2 flex flex-wrap gap-2"><Pill value={rec.impact} label={`Impact ${rec.impact}`} /><Pill value="moyen" label={`Effort ${rec.effort}`} /></div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {r.erreurs.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-charcoal-800 mb-2">Erreurs à trancher</h3>
          <ul className="space-y-3">
            {r.erreurs.map((e, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2"><Pill value={e.action === "corriger" ? "haute" : "moyenne"} label={ACTION[e.action] ?? e.action} /><span className="font-medium text-charcoal-800 break-words">{e.message.slice(0, 160)}</span></div>
                <p className="mt-1 text-charcoal-600">{e.diagnostic}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(() => {
        const prompts = buildReportPrompts(r, date(row.created_at), row.id);
        if (!prompts.length) return null;
        return (
          <div>
            <h3 className="text-base font-semibold text-charcoal-800 mb-1">Prompts pour Claude Code</h3>
            <p className="text-sm text-charcoal-500 mb-3">Copie un prompt et colle-le dans Claude Code pour qu’il s’en charge.</p>
            <ul className="space-y-3">
              {prompts.map((p, i) => (
                <li key={i} className="rounded-xl border border-[#ebebeb] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-charcoal-800">{p.titre}</p>
                    <CopyPromptButton text={p.prompt} />
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-charcoal-50 p-3 text-xs text-charcoal-600 whitespace-pre-wrap break-words font-sans">{p.prompt}</pre>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {r.suivi && (
        <div>
          <h3 className="text-base font-semibold text-charcoal-800 mb-2">Suivi de la semaine précédente</h3>
          <p className="text-sm text-charcoal-600">{r.suivi}</p>
        </div>
      )}
    </div>
  );
}

export default async function AdminReportsPage() {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin
    .from("weekly_reports")
    .select("id, created_at, period_start, period_end, report, model")
    .order("created_at", { ascending: false })
    .limit(26);
  const rows = (data ?? []) as Row[];
  const [latest, ...older] = rows;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Rapports du lundi</h1>
          <p className="mt-2 text-base text-charcoal-500">
            Chaque lundi matin, Claude analyse la semaine (Santé de la plateforme, tunnels, erreurs) et te propose quoi faire. Aussi envoyé par courriel.
          </p>
        </div>
        {!error && <GenerateReportButton />}
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-warning-700">
          Rapports pas encore activés : exécuter supabase/add-weekly-reports.sql dans Supabase.
        </p>
      ) : !latest ? (
        <p className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-charcoal-500">
          Aucun rapport pour l’instant. Le premier arrivera lundi matin, ou génère-le maintenant.
        </p>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 sm:p-6">
            <p className="text-sm font-medium text-charcoal-400 mb-4">
              Semaine du {date(latest.period_start)} au {date(latest.period_end)}
            </p>
            <Report row={latest} />
          </section>

          {older.length > 0 && (
            <section className="mt-10">
              <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">Rapports précédents</h2>
              <div className="space-y-3">
                {older.map((row) => (
                  <details key={row.id} className="rounded-2xl border border-[#ebebeb] bg-white p-5">
                    <summary className="cursor-pointer text-base font-medium text-charcoal-800">
                      Semaine du {date(row.period_start)} au {date(row.period_end)}
                    </summary>
                    <div className="mt-4"><Report row={row} /></div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
