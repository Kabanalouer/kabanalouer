"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export type SubType = "free_launch" | "annual" | "degressive";
export type SubStatus = "active" | "expired" | "canceled";

export type SubscriptionRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalListings: number;
  type: SubType;
  status: SubStatus;
  createdAt: string;
  expiresAt: string | null;
};

type FilterKey = "all" | SubStatus | "free_launch";
type SortKey = "expiresAt" | "status" | "type" | "createdAt";
type SortDir = "asc" | "desc";

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "expired", label: "Expirés" },
  { key: "canceled", label: "Annulés" },
  { key: "free_launch", label: "Gratuits lancement" },
];

const TYPE_BADGE: Record<SubType, { bg: string; text: string; label: string }> = {
  free_launch: { bg: "bg-[#f5f6ec]", text: "text-primary", label: "Gratuit lancement" },
  annual:      { bg: "bg-green-50",  text: "text-green-700", label: "Annuel 299 $/an" },
  degressive:  { bg: "bg-blue-50",   text: "text-blue-700",  label: "Dégressif" },
};

const STATUS_BADGE: Record<SubStatus, { bg: string; text: string; label: string }> = {
  active:   { bg: "bg-green-50", text: "text-green-700", label: "Actif" },
  expired:  { bg: "bg-red-50",   text: "text-red-700",   label: "Expiré" },
  canceled: { bg: "bg-charcoal-100", text: "text-charcoal-500", label: "Annulé" },
};

const STATUS_ORDER: Record<SubStatus, number> = { active: 0, expired: 1, canceled: 2 };
const TYPE_ORDER: Record<SubType, number> = { free_launch: 0, annual: 1, degressive: 2 };

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (name[0] ?? "?");
  return (
    <div className="w-9 h-9 rounded-full bg-[#f5f6ec] text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
      {letters.toUpperCase()}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 ${active ? "text-primary" : "text-charcoal-300"}`}>
      {active && dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#ebebeb] px-5 py-4">
      <p className="text-xs text-charcoal-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-charcoal-800">{value}</p>
      {sub && <p className="text-xs text-charcoal-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function exportCSV(rows: SubscriptionRow[]) {
  const active = rows.filter((r) => r.status === "active");
  const headers = ["Nom", "Email", "Type", "Date début", "Date fin", "Montant (CA$)"];
  const lines = active.map((r) => [
    `"${r.name.replace(/"/g, '""')}"`,
    `"${r.email.replace(/"/g, '""')}"`,
    `"${TYPE_BADGE[r.type].label}"`,
    `"${fmtDate(r.createdAt)}"`,
    `"${fmtDate(r.expiresAt)}"`,
    r.type === "free_launch" ? "0" : "299",
  ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "abonnements-actifs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSubscriptionsClient({
  subscriptions,
  metrics,
}: {
  subscriptions: SubscriptionRow[];
  metrics: { totalActive: number; freeLaunch: number; paid: number; revenue: number };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("expiresAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalRow, setModalRow] = useState<SubscriptionRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return subscriptions
      .filter((s) => {
        if (filter === "free_launch" && s.type !== "free_launch") return false;
        if (filter === "active" && s.status !== "active") return false;
        if (filter === "expired" && s.status !== "expired") return false;
        if (filter === "canceled" && s.status !== "canceled") return false;
        if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "expiresAt") {
          cmp = (a.expiresAt ?? "").localeCompare(b.expiresAt ?? "");
        } else if (sortKey === "createdAt") {
          cmp = a.createdAt.localeCompare(b.createdAt);
        } else if (sortKey === "status") {
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        } else {
          cmp = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [subscriptions, filter, search, sortKey, sortDir]);

  async function handleAction(userId: string, action: "activate_free" | "extend" | "deactivate") {
    setActionLoading(action);
    setActionError("");
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setActionError(d.error ?? "Erreur");
      } else {
        setModalRow(null);
        router.refresh();
      }
    } catch {
      setActionError("Erreur réseau");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Abonnements actifs" value={metrics.totalActive} />
        <MetricCard label="Gratuits lancement" value={metrics.freeLaunch} />
        <MetricCard label="Payants" value={metrics.paid} />
        <MetricCard
          label="Revenus estimés"
          value={`${metrics.revenue.toLocaleString("fr-CA")} $`}
          sub="299 $/an × abonnements payants"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm px-4 py-1.5 rounded-full font-medium border transition-colors ${
                filter === key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="text-sm pl-9 pr-4 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="text-xs text-charcoal-400">
          {filtered.length} abonnement{filtered.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => exportCSV(subscriptions)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-600 hover:border-charcoal-300 hover:text-charcoal-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Proprio
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide whitespace-nowrap">
                  Annonces
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("type")}
                >
                  Type <SortIcon active={sortKey === "type"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("status")}
                >
                  Statut <SortIcon active={sortKey === "status"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("createdAt")}
                >
                  Début <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("expiresAt")}
                >
                  Renouvellement <SortIcon active={sortKey === "expiresAt"} dir={sortDir} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const typeBadge = TYPE_BADGE[s.type];
                const statusBadge = STATUS_BADGE[s.status];
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors"
                  >
                    {/* Proprio */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatarUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <Initials name={s.name || "?"} />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal-800 truncate max-w-[180px]">{s.name || "—"}</p>
                          <p className="text-xs text-charcoal-400 truncate max-w-[180px]">{s.email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Annonces */}
                    <td className="px-4 py-3 text-charcoal-600 font-medium">
                      {s.totalListings}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeBadge.bg} ${typeBadge.text}`}>
                        {typeBadge.label}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Début */}
                    <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap">
                      {fmtDate(s.createdAt)}
                    </td>

                    {/* Renouvellement */}
                    <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap">
                      {fmtDate(s.expiresAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setModalRow(s); setActionError(""); }}
                        className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                      >
                        Gérer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-charcoal-400">
                    Aucun abonnement ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalRow(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-charcoal-800 text-base">Gérer l&apos;abonnement</h2>
              <button
                onClick={() => setModalRow(null)}
                className="text-charcoal-300 hover:text-charcoal-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Proprio info */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#ebebeb]">
              {modalRow.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalRow.avatarUrl} alt={modalRow.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Initials name={modalRow.name || "?"} />
              )}
              <div>
                <p className="font-semibold text-charcoal-800">{modalRow.name}</p>
                <p className="text-sm text-charcoal-400">{modalRow.email}</p>
              </div>
            </div>

            {/* Résumé abonnement */}
            <div className="bg-charcoal-50 rounded-xl p-4 mb-5 text-sm space-y-2">
              <p className="font-semibold text-charcoal-700 mb-2">Abonnement actuel</p>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Type</span>
                <span className={`font-medium ${TYPE_BADGE[modalRow.type].text}`}>{TYPE_BADGE[modalRow.type].label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Statut</span>
                <span className={`font-medium ${STATUS_BADGE[modalRow.status].text}`}>{STATUS_BADGE[modalRow.status].label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Début</span>
                <span className="text-charcoal-600">{fmtDate(modalRow.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Renouvellement</span>
                <span className="text-charcoal-600">{fmtDate(modalRow.expiresAt)}</span>
              </div>
            </div>

            {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

            <div className="space-y-2">
              <button
                onClick={() => handleAction(modalRow.userId, "activate_free")}
                disabled={!!actionLoading || modalRow.status === "active"}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#f5f6ec] text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "activate_free" ? "En cours…" : "Activer abonnement gratuit"}
              </button>
              <button
                onClick={() => handleAction(modalRow.userId, "extend")}
                disabled={!!actionLoading}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "extend" ? "En cours…" : "Prolonger d'un an"}
              </button>
              <button
                onClick={() => handleAction(modalRow.userId, "deactivate")}
                disabled={!!actionLoading || modalRow.status === "canceled"}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "deactivate" ? "En cours…" : "Désactiver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
