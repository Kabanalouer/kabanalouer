import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { setErrorStatus } from "./actions";

export const metadata = { title: "Erreurs — Administration" };
export const dynamic = "force-dynamic";

type ErrorGroup = {
  fingerprint: string;
  source: "client" | "server";
  message: string;
  path: string | null;
  stack: string | null;
  user_agent: string | null;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  ignored: boolean;
};

const TABS = [
  { value: "open", label: "À régler" },
  { value: "resolved", label: "Réglées" },
  { value: "ignored", label: "Ignorées" },
] as const;

function when(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const h = diff / 3_600_000;
  if (h < 1) return `il y a ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (h < 48) return `il y a ${Math.round(h)} h`;
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

// Lecture hors du rendu (l'heure courante sert aux « il y a … »).
async function loadErrors(): Promise<{ all: ErrorGroup[]; error: boolean; now: number }> {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin
    .from("error_groups")
    .select("fingerprint, source, message, path, stack, user_agent, count, first_seen_at, last_seen_at, resolved_at, ignored")
    .order("last_seen_at", { ascending: false })
    .limit(500);
  return { all: (data ?? []) as ErrorGroup[], error: !!error, now: Date.now() };
}

export default async function AdminErrorsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.value === rawTab)?.value ?? "open";
  const { all, error, now } = await loadErrors();
  const groups = all.filter((g) =>
    tab === "open" ? !g.resolved_at : tab === "ignored" ? g.ignored : !!g.resolved_at && !g.ignored,
  );
  const counts = {
    open: all.filter((g) => !g.resolved_at).length,
    resolved: all.filter((g) => g.resolved_at && !g.ignored).length,
    ignored: all.filter((g) => g.ignored).length,
  };
  const last24h = all.filter((g) => !g.ignored && now - new Date(g.last_seen_at).getTime() < 86_400_000).length;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-800">Erreurs</h1>
      <p className="mt-2 text-base text-charcoal-500">
        Les plantages du site, côté visiteurs et côté serveur, regroupés par erreur. Une alerte part par courriel à la
        première apparition d’une erreur, ou quand une erreur réglée revient.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-warning-700">
          Suivi pas encore activé : exécuter supabase/add-error-groups.sql dans Supabase.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-base text-charcoal-700">
              <span className="font-semibold text-charcoal-800">{counts.open} à régler</span>
              <span className="text-charcoal-500"> · {last24h} vues dans les dernières 24 h</span>
            </p>
            <nav className="inline-flex self-start rounded-full border border-[#ebebeb] bg-white p-1">
              {TABS.map((t) => (
                <Link
                  key={t.value}
                  href={`/admin/erreurs?tab=${t.value}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    t.value === tab ? "bg-primary text-white" : "text-charcoal-600 hover:text-charcoal-800"
                  }`}
                >
                  {t.label} ({counts[t.value]})
                </Link>
              ))}
            </nav>
          </div>

          {groups.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-[#ebebeb] bg-white p-5 text-sm text-charcoal-500">
              {tab === "open" ? "Aucune erreur à régler." : "Rien ici pour l’instant."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#ebebeb] rounded-2xl border border-[#ebebeb] bg-white">
              {groups.map((g) => (
                <li key={g.fingerprint} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${g.source === "client" ? "bg-[#f5f6ec] text-primary" : "bg-charcoal-100 text-charcoal-600"}`}>
                          {g.source === "client" ? "Navigateur" : "Serveur"}
                        </span>
                        <span className="text-xs text-charcoal-400">
                          {g.count} fois · dernière {when(g.last_seen_at, now)} · première {when(g.first_seen_at, now)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-charcoal-800 break-words">{g.message}</p>
                      {g.path && <p className="mt-1 text-xs text-charcoal-500 break-all">Page : {g.path}</p>}
                      {(g.stack || g.user_agent) && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-primary">Détails techniques</summary>
                          {g.user_agent && <p className="mt-2 text-xs text-charcoal-500 break-all">Navigateur : {g.user_agent}</p>}
                          {g.stack && (
                            <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-charcoal-50 p-3 text-xs text-charcoal-600 whitespace-pre-wrap break-all">
                              {g.stack}
                            </pre>
                          )}
                        </details>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                      {tab === "open" ? (
                        <>
                          <form action={setErrorStatus.bind(null, g.fingerprint, "resolved")}>
                            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
                              Marquer comme réglée
                            </button>
                          </form>
                          <form action={setErrorStatus.bind(null, g.fingerprint, "ignored")}>
                            <button className="rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 transition-colors">
                              Ignorer
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={setErrorStatus.bind(null, g.fingerprint, "open")}>
                          <button className="rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 transition-colors">
                            Rouvrir
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-charcoal-400">
            Réglée : elle revient dans « À régler » (avec une alerte) si elle réapparaît. Ignorée : sans importance, plus
            jamais d’alerte. Une même erreur en rafale est comptée au plus une fois par minute.
          </p>
        </>
      )}
    </div>
  );
}
