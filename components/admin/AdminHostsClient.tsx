"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type SubscriptionInfo = {
  status: string;
  isFreeLaunch: boolean;
  expiresAt: string | null;
  createdAt: string | null;
} | null;

export type SubLabel = "active" | "free_launch" | "expired" | "none";

export type HostRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalListings: number;
  publishedListings: number;
  createdAt: string;
  subscription: SubscriptionInfo;
  subLabel: SubLabel;
};

type SortKey = "createdAt" | "totalListings";
type SortDir = "asc" | "desc";

const SUB_LABELS: { key: SubLabel | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Abonnement actif" },
  { key: "free_launch", label: "Gratuit lancement" },
  { key: "expired", label: "Expiré" },
  { key: "none", label: "Sans abonnement" },
];

const SUB_BADGE: Record<SubLabel, { bg: string; text: string; label: string }> = {
  active:      { bg: "bg-green-50",      text: "text-green-700", label: "Actif" },
  free_launch: { bg: "bg-[#f5f6ec]",     text: "text-primary",   label: "Gratuit lancement" },
  expired:     { bg: "bg-red-50",        text: "text-red-700",   label: "Expiré" },
  none:        { bg: "bg-charcoal-100",  text: "text-charcoal-500", label: "Aucun" },
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (name[0] ?? "?");
  return (
    <div className="w-9 h-9 rounded-full bg-[#f5f6ec] text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
      {letters.toUpperCase()}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return <span className={`ml-1 ${active ? "text-primary" : "text-charcoal-300"}`}>{active && dir === "asc" ? "↑" : "↓"}</span>;
}

export default function AdminHostsClient({ hosts }: { hosts: HostRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<SubLabel | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalHost, setModalHost] = useState<HostRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return hosts
      .filter((h) => {
        if (filter !== "all" && h.subLabel !== filter) return false;
        if (q && !h.name.toLowerCase().includes(q) && !h.email.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = sortKey === "createdAt"
          ? a.createdAt.localeCompare(b.createdAt)
          : a.totalListings - b.totalListings;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [hosts, filter, search, sortKey, sortDir]);

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
        setModalHost(null);
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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {SUB_LABELS.map(({ key, label }) => (
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm pl-9 pr-4 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="ml-auto text-xs text-charcoal-400">{filtered.length} proprio{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Proprio</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("totalListings")}
                >
                  Annonces <SortIcon active={sortKey === "totalListings"} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Abonnement</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("createdAt")}
                >
                  Inscrit le <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const badge = SUB_BADGE[h.subLabel];
                return (
                  <tr key={h.id} className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors">
                    {/* Proprio */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {h.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.avatarUrl} alt={h.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <Initials name={h.name || "?"} />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal-800 truncate max-w-[180px]">{h.name || "—"}</p>
                          <p className="text-xs text-charcoal-400 truncate max-w-[180px]">{h.email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Annonces */}
                    <td className="px-4 py-3 text-charcoal-600">
                      <span className="font-medium">{h.publishedListings}</span>
                      <span className="text-charcoal-400"> / {h.totalListings}</span>
                    </td>

                    {/* Abonnement */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {h.subscription?.expiresAt && (
                        <p className="text-[11px] text-charcoal-400 mt-0.5">
                          Exp. {new Date(h.subscription.expiresAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/listings?q=${encodeURIComponent(h.name)}`}
                          className="text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors"
                        >
                          Voir les annonces
                        </Link>
                        <button
                          onClick={() => { setModalHost(h); setActionError(""); }}
                          className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                        >
                          Gérer l&apos;abonnement
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-charcoal-400">
                    Aucun propriétaire ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalHost(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-charcoal-800 text-base">Gérer l&apos;abonnement</h2>
              <button onClick={() => setModalHost(null)} className="text-charcoal-300 hover:text-charcoal-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Host info */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#ebebeb]">
              {modalHost.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalHost.avatarUrl} alt={modalHost.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Initials name={modalHost.name || "?"} />
              )}
              <div>
                <p className="font-semibold text-charcoal-800">{modalHost.name}</p>
                <p className="text-sm text-charcoal-400">{modalHost.email}</p>
              </div>
            </div>

            {/* Current subscription */}
            <div className="bg-charcoal-50 rounded-xl p-4 mb-5 text-sm space-y-1.5">
              <p className="font-semibold text-charcoal-700 mb-2">Abonnement actuel</p>
              {modalHost.subscription ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-charcoal-400">Statut</span>
                    <span className={`font-medium ${SUB_BADGE[modalHost.subLabel].text}`}>{SUB_BADGE[modalHost.subLabel].label}</span>
                  </div>
                  {modalHost.subscription.isFreeLaunch && (
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Type</span>
                      <span className="text-charcoal-600">Gratuit lancement</span>
                    </div>
                  )}
                  {modalHost.subscription.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Début</span>
                      <span className="text-charcoal-600">{new Date(modalHost.subscription.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  )}
                  {modalHost.subscription.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Expiration</span>
                      <span className="text-charcoal-600">{new Date(modalHost.subscription.expiresAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-charcoal-400">Aucun abonnement</p>
              )}
            </div>

            {/* Actions */}
            {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
            <div className="space-y-2">
              <button
                onClick={() => handleAction(modalHost.id, "activate_free")}
                disabled={!!actionLoading || modalHost.subLabel === "active" || modalHost.subLabel === "free_launch"}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#f5f6ec] text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "activate_free" ? "En cours…" : "Activer abonnement gratuit"}
              </button>
              <button
                onClick={() => handleAction(modalHost.id, "extend")}
                disabled={!!actionLoading}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "extend" ? "En cours…" : "Prolonger d'un an"}
              </button>
              <button
                onClick={() => handleAction(modalHost.id, "deactivate")}
                disabled={!!actionLoading || modalHost.subLabel === "none" || modalHost.subLabel === "expired"}
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
