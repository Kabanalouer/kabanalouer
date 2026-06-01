"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getScoreLevel } from "@/lib/listingScore";

export type ListingRow = {
  id: string;
  title: string;
  region: string;
  photoUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  score: number;
  hostName: string;
};

type SortKey = "createdAt" | "score" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block transition-colors ${active ? "text-primary" : "text-charcoal-300"}`}>
      {active && dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export default function AdminListingsClient({
  listings,
  regions,
}: {
  listings: ListingRow[];
  regions: string[];
}) {
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return listings
      .filter((l) => {
        if (status === "published" && !l.isPublished) return false;
        if (status === "draft" && l.isPublished) return false;
        if (region && l.region !== region) return false;
        if (q && !l.title.toLowerCase().includes(q) && !l.hostName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
        else if (sortKey === "score") cmp = a.score - b.score;
        else if (sortKey === "status") cmp = Number(a.isPublished) - Number(b.isPublished);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [listings, status, region, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  // Page numbers to show
  const pageNums = useMemo(() => {
    const nums: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) nums.push(i);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    return nums;
  }, [totalPages, page]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status pills */}
        <div className="flex gap-1.5">
          {(["all", "published", "draft"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(() => setStatus(s))}
              className={`text-sm px-4 py-1.5 rounded-full font-medium border transition-colors ${
                status === s
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-charcoal-600 border-[#ebebeb] hover:border-charcoal-300"
              }`}
            >
              {s === "all" ? "Toutes" : s === "published" ? "Publiées" : "Non publiées"}
            </button>
          ))}
        </div>

        {/* Region select */}
        <select
          value={region}
          onChange={(e) => handleFilterChange(() => setRegion(e.target.value))}
          className="text-sm px-3 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-600 hover:border-charcoal-300 transition-colors appearance-none pr-7 cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='1.75'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "0.9rem" }}
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Titre ou proprio…"
            value={search}
            onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
            className="text-sm pl-9 pr-4 py-1.5 rounded-full border border-[#ebebeb] bg-white text-charcoal-700 placeholder-charcoal-300 hover:border-charcoal-300 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <span className="ml-auto text-xs text-charcoal-400">{filtered.length} annonce{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#ebebeb]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide w-14">Photo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Région</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("score")}
                >
                  Score <SortIcon active={sortKey === "score"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600"
                  onClick={() => toggleSort("status")}
                >
                  Statut <SortIcon active={sortKey === "status"} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide cursor-pointer select-none hover:text-charcoal-600 whitespace-nowrap"
                  onClick={() => toggleSort("createdAt")}
                >
                  Créée le <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-charcoal-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l) => {
                const { color } = getScoreLevel(l.score);
                return (
                  <tr key={l.id} className="border-b border-[#ebebeb] last:border-0 hover:bg-charcoal-50 transition-colors">
                    {/* Photo */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-charcoal-100 overflow-hidden shrink-0">
                        {l.photoUrl ? (
                          <Image src={l.photoUrl} alt={l.title} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Titre + proprio */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium text-charcoal-800 truncate">{l.title || "Sans titre"}</p>
                      <p className="text-xs text-charcoal-400 truncate">{l.hostName}</p>
                    </td>

                    {/* Région */}
                    <td className="px-4 py-3 text-charcoal-500 whitespace-nowrap">{l.region || "—"}</td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color }}>{l.score}</span>
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        l.isPublished ? "bg-green-50 text-green-700" : "bg-charcoal-100 text-charcoal-500"
                      }`}>
                        {l.isPublished ? "Publié" : "Non publié"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-charcoal-400 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/listings/${l.id}/edit`}
                          className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                        >
                          Modifier
                        </Link>
                        {l.isPublished && (
                          <Link
                            href={`/chalets/${l.id}`}
                            target="_blank"
                            className="text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors"
                          >
                            Voir la fiche ↗
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-charcoal-400">
                    Aucune annonce ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[#ebebeb] flex items-center justify-between gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Précédent
            </button>
            <div className="flex items-center gap-1">
              {pageNums.map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-charcoal-300 text-sm">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === n ? "bg-primary text-white" : "text-charcoal-600 hover:bg-charcoal-50"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm px-3 py-1.5 rounded-lg border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
