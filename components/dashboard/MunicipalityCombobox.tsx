"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import municipalitiesData from "@/lib/municipalities.json";

export interface Municipality {
  name: string;
  slug: string;
  region: string;
  officialCode: string;
  mrc: string;
}

const ALL = municipalitiesData as Municipality[];
const MAX_RESULTS = 8;

// Comparaison insensible aux accents/casse pour la recherche uniquement —
// l'affichage garde toujours le nom officiel exact (pas de "title case" ou
// de normalisation appliquée au texte montré à l'utilisateur).
function normalizeForSearch(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function MunicipalityCombobox({
  value,
  onSelect,
  className,
  placeholder,
}: {
  value: string;
  onSelect: (municipality: Municipality) => void;
  className: string;
  placeholder?: string;
}) {
  const t = useTranslations("listings.location");
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Garde le texte affiché synchro si le parent change `value` de l'extérieur
  // (ex. correspondance auto-détectée depuis une sélection Google Places).
  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Municipalités qui commencent par la recherche d'abord, puis celles qui la
  // contiennent seulement — dans les deux cas, ordre alphabétique préservé
  // (municipalities.json est déjà trié, tri stable ici).
  const matches = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return [];
    const scored: { m: Municipality; rank: 0 | 1 }[] = [];
    for (const m of ALL) {
      const n = normalizeForSearch(m.name);
      if (n.startsWith(q)) scored.push({ m, rank: 0 });
      else if (n.includes(q)) scored.push({ m, rank: 1 });
    }
    scored.sort((a, b) => a.rank - b.rank);
    return scored.slice(0, MAX_RESULTS).map((s) => s.m);
  }, [query]);

  const handlePick = (m: Municipality) => {
    setQuery(m.name);
    setOpen(false);
    onSelect(m);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && query.trim() && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-[#ebebeb] z-20 max-h-60 overflow-y-auto">
          {matches.length > 0 ? (
            matches.map((m) => (
              <button
                key={m.officialCode}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(m);
                }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-charcoal-50 transition-colors"
              >
                <span className="text-charcoal-700">{m.name}</span>
                <span className="text-xs text-charcoal-400 shrink-0">{m.region}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-charcoal-400">{t("cityNoResults")}</div>
          )}
        </div>
      )}
    </div>
  );
}
