"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type TravelerRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  messageCount: number;
  reviewCount: number;
  favoriteCount: number;
  createdAt: string;
};

type SortKey = "createdAt" | "messageCount" | "reviewCount";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

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

export default function AdminTravelersClient({ travelers }: { travelers: TravelerRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return travelers
      .filter((t) => {
        if (q && !t.name.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
        else if (sortKey === "messageCount") cmp = a.messageCount - b.messageCount;
        else cmp = a.reviewCount - b.reviewCount;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [travelers, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-sm pl-9 pr-4 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="ml-auto text-xs text-charcoal-400">
          {filtered.length} voyageur{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Voyageur
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("messageCount")}
                >
                  Messages <SortIcon active={sortKey === "messageCount"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("reviewCount")}
                >
                  Avis <SortIcon active={sortKey === "reviewCount"} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide whitespace-nowrap">
                  Favoris
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("createdAt")}
                >
                  Inscrit le <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors"
                >
                  {/* Voyageur */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <Initials name={t.name || "?"} />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-800 truncate max-w-[200px]">
                          {t.name || "—"}
                        </p>
                        <p className="text-xs text-charcoal-400 truncate max-w-[200px]">
                          {t.email || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Messages */}
                  <td className="px-4 py-3 text-charcoal-600">
                    <span className="font-medium">{t.messageCount}</span>
                  </td>

                  {/* Avis */}
                  <td className="px-4 py-3 text-charcoal-600">
                    <span className="font-medium">{t.reviewCount}</span>
                  </td>

                  {/* Favoris */}
                  <td className="px-4 py-3 text-charcoal-600">
                    <span className="font-medium">{t.favoriteCount}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("fr-CA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/messages?traveler_id=${t.id}`}
                      className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                    >
                      Voir les messages
                    </Link>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-charcoal-400">
                    Aucun voyageur ne correspond à la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-charcoal-400">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#ebebeb] bg-white text-charcoal-600 hover:border-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#ebebeb] bg-white text-charcoal-600 hover:border-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
