"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const REGIONS = [
  "Charlevoix",
  "Estrie (Cantons-de-l'Est)",
  "Gaspésie",
  "Lanaudière",
  "Laurentides",
  "Mauricie",
  "Outaouais",
  "Québec (ville et région)",
  "Saguenay–Lac-Saint-Jean",
  "Abitibi-Témiscamingue",
  "Côte-Nord",
  "Centre-du-Québec",
];

const QUICK_AMENITIES = [
  "Bord du lac",
  "Spa",
  "Sauna",
  "Ski alpin",
  "Foyer",
  "Animaux acceptés",
];

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [region, setRegion] = useState(params.get("region") ?? "");
  const [capacity, setCapacity] = useState(params.get("capacity") ?? "");
  const [amenity, setAmenity] = useState(params.get("amenity") ?? "");

  const apply = (overrides: Record<string, string> = {}) => {
    const next = new URLSearchParams();
    const r = overrides.region ?? region;
    const c = overrides.capacity ?? capacity;
    const a = overrides.amenity ?? amenity;
    if (r) next.set("region", r);
    if (c) next.set("capacity", c);
    if (a) next.set("amenity", a);
    startTransition(() => router.push(`/chalets?${next.toString()}`));
  };

  const reset = () => {
    setRegion("");
    setCapacity("");
    setAmenity("");
    startTransition(() => router.push("/chalets"));
  };

  const hasFilters = region || capacity || amenity;

  return (
    <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main filters row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Region */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Région</label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                apply({ region: e.target.value });
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Toutes les régions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Capacity */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Voyageurs</label>
            <select
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                apply({ capacity: e.target.value });
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Peu importe</option>
              <option value="2">2+ personnes</option>
              <option value="4">4+ personnes</option>
              <option value="6">6+ personnes</option>
              <option value="8">8+ personnes</option>
              <option value="12">12+ personnes</option>
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={reset}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              Effacer les filtres ×
            </button>
          )}

          {isPending && (
            <span className="text-xs text-gray-400 animate-pulse">Recherche…</span>
          )}
        </div>

        {/* Quick amenity tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_AMENITIES.map((a) => (
            <button
              key={a}
              onClick={() => {
                const next = amenity === a ? "" : a;
                setAmenity(next);
                apply({ amenity: next });
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                amenity === a
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
