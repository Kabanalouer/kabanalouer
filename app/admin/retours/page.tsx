import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import CopyPromptButton from "@/components/admin/CopyPromptButton";
import { buildFeedbackPrompt } from "@/lib/feedbackPrompt";
import type { FeedbackTriage } from "@/lib/feedback";
import { setFeedbackStatus } from "./actions";

export const metadata = { title: "Retours des utilisateurs — Administration" };
export const dynamic = "force-dynamic";

type Row = {
  id: number;
  created_at: string;
  kind: "probleme" | "idee" | "autre";
  message: string;
  page: string | null;
  triage: FeedbackTriage | null;
  status: "nouveau" | "en_cours" | "regle" | "ferme";
  user: { name: string | null; email: string | null; role: string | null } | null;
};

const TABS = [
  { value: "ouverts", label: "À traiter" },
  { value: "regle", label: "Réglés" },
  { value: "ferme", label: "Fermés" },
] as const;
const KIND = { probleme: "Problème", idee: "Idée", autre: "Autre" } as const;
const STATUS = { nouveau: "Nouveau", en_cours: "En cours", regle: "Réglé", ferme: "Fermé" } as const;
const PRIORITY = { haute: "bg-warning-50 text-warning-700", moyenne: "bg-charcoal-100 text-charcoal-600", basse: "bg-charcoal-100 text-charcoal-500" } as const;

async function load(): Promise<{ rows: Row[]; error: boolean }> {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin
    .from("feedback")
    .select("id, created_at, kind, message, page, triage, status, user:user_id(name, email, role)")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []).map((r) => ({ ...r, user: Array.isArray(r.user) ? r.user[0] ?? null : r.user })) as Row[];
  return { rows, error: !!error };
}

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto" });

function StatusButton({ id, status, label }: { id: number; status: Row["status"]; label: string }) {
  return (
    <form action={setFeedbackStatus.bind(null, id, status)}>
      <button className="rounded-full border border-[#ebebeb] bg-white px-3.5 py-1.5 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 transition-colors">
        {label}
      </button>
    </form>
  );
}

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.value === rawTab)?.value ?? "ouverts";
  const { rows, error } = await load();
  const inTab = (r: Row) => (tab === "ouverts" ? r.status === "nouveau" || r.status === "en_cours" : r.status === tab);
  const visible = rows.filter(inTab);
  const counts = {
    ouverts: rows.filter((r) => r.status === "nouveau" || r.status === "en_cours").length,
    regle: rows.filter((r) => r.status === "regle").length,
    ferme: rows.filter((r) => r.status === "ferme").length,
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Retours des utilisateurs</h1>
      <p className="mt-2 text-base text-charcoal-500">
        Ce que les proprios et les voyageurs connectés écrivent avec « Une idée ou un problème ? » (tableau de bord ou menu de
        compte), trié par Claude. Le message arrive aussi dans info@ : réponds depuis ce courriel-là.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-warning-700">
          Retours pas encore activés : exécuter supabase/add-feedback.sql dans Supabase.
        </p>
      ) : (
        <>
          <nav className="mt-8 inline-flex rounded-full border border-[#ebebeb] bg-white p-1">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={`/admin/retours?tab=${t.value}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${t.value === tab ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"}`}
              >
                {t.label} ({counts[t.value]})
              </Link>
            ))}
          </nav>

          {visible.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-charcoal-500">
              {tab === "ouverts" ? "Aucun retour à traiter." : "Rien ici pour l’instant."}
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {visible.map((r) => (
                <li key={r.id} className="rounded-2xl border border-[#ebebeb] bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[#f5f6ec] px-2.5 py-0.5 font-semibold text-primary">{KIND[r.kind]}</span>
                    <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 font-semibold text-charcoal-600">{r.user?.role === "host" ? "Proprio" : "Voyageur"}</span>
                    {r.triage && (
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${PRIORITY[r.triage.priorite]}`}>Priorité {r.triage.priorite}</span>
                    )}
                    <span className="rounded-full bg-charcoal-100 px-2.5 py-0.5 font-semibold text-charcoal-600">{STATUS[r.status]}</span>
                    <span className="text-charcoal-400">
                      n° {r.id} · {date(r.created_at)} · {r.user?.name ?? "Utilisateur"}
                      {r.user?.email ? ` (${r.user.email})` : ""}
                      {r.page ? ` · ${r.page}` : ""}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-base text-charcoal-800">{r.message}</p>

                  {r.triage ? (
                    <div className="mt-4 rounded-xl bg-charcoal-50 p-4 text-sm">
                      <p className="font-medium text-charcoal-800">{r.triage.resume}</p>
                      <p className="mt-1 text-charcoal-600">{r.triage.recommandation}</p>
                      {r.triage.action_recommandee && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white p-3">
                          <span className="text-sm text-charcoal-600">Prompt pour Claude Code</span>
                          <CopyPromptButton text={buildFeedbackPrompt(r.id, r.triage.resume)} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-charcoal-400">Analyse en cours ou indisponible.</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.status !== "en_cours" && r.status !== "regle" && r.status !== "ferme" && <StatusButton id={r.id} status="en_cours" label="En cours" />}
                    {r.status !== "regle" && <StatusButton id={r.id} status="regle" label="Réglé" />}
                    {r.status !== "ferme" && <StatusButton id={r.id} status="ferme" label="Fermer" />}
                    {(r.status === "regle" || r.status === "ferme") && <StatusButton id={r.id} status="nouveau" label="Rouvrir" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
