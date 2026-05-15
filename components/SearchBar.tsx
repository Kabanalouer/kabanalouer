"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function SearchBar() {
  const [region, setRegion] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    router.push(`/chalets?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row flex-wrap gap-2 w-full max-w-3xl">
      {/* Region */}
      <div className="flex flex-1 items-center gap-3 px-4 py-2 min-w-[160px]">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <select
          className="flex-1 bg-transparent text-gray-700 outline-none text-sm appearance-none cursor-pointer"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">Toutes les régions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="hidden sm:block w-px bg-gray-100 self-stretch" />

      {/* Check-in */}
      <div className="flex items-center gap-2 px-4 py-2 min-w-[130px]">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          type="date"
          value={checkin}
          min={today}
          onChange={(e) => {
            setCheckin(e.target.value);
            if (checkout && e.target.value >= checkout) setCheckout("");
          }}
          className="bg-transparent text-gray-700 text-sm outline-none cursor-pointer w-full"
          placeholder="Arrivée"
        />
      </div>

      <div className="hidden sm:block w-px bg-gray-100 self-stretch" />

      {/* Check-out */}
      <div className="flex items-center gap-2 px-4 py-2 min-w-[130px]">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          type="date"
          value={checkout}
          min={checkin || today}
          onChange={(e) => setCheckout(e.target.value)}
          className="bg-transparent text-gray-700 text-sm outline-none cursor-pointer w-full"
          placeholder="Départ"
        />
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Rechercher
      </button>
    </div>
  );
}
