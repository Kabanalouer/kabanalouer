"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type HostSubscription = {
  listingId: string;
  listingTitle: string;
  isFreeLaunch: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  subLabel: SubLabel;
};

export type SubLabel = "active" | "free_launch" | "expired" | "none";

export type HostRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalListings: number;
  publishedListings: number;
  createdAt: string;
  subscriptions: HostSubscription[];
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
  const [filter, setFilter] = useState<SubLabel | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return hosts
      .filter((h) => {
        if (filter === "none" && h.subscriptions.length > 0) return false;
        if (filter !== "all" && filter !== "none" && !h.subscriptions.some((s) => s.subLabel === filter)) return false;
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
                      {h.subscriptions.length === 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${SUB_BADGE.none.bg} ${SUB_BADGE.none.text}`}>
                          {SUB_BADGE.none.label}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {h.subscriptions.map((s) => (
                            <span
                              key={s.listingId}
                              title={s.listingTitle}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${SUB_BADGE[s.subLabel].bg} ${SUB_BADGE[s.subLabel].text}`}
                            >
                              {SUB_BADGE[s.subLabel].label}
                            </span>
                          ))}
                        </div>
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
                        <Link
                          href={`/admin/subscriptions?q=${encodeURIComponent(h.name)}`}
                          className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                        >
                          Gérer les abonnements
                        </Link>
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

    </div>
  );
}
