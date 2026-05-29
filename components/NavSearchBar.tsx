"use client";

import React, { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "./SearchBar";
import FiltersModal from "./chalets/FiltersModal";

// ── Constants ────────────────────────────────────────────────────────────────

const REGIONS = [
  "Charlevoix", "Estrie (Cantons-de-l'Est)", "Gaspésie", "Lanaudière",
  "Laurentides", "Mauricie", "Outaouais", "Québec (ville et région)",
  "Saguenay–Lac-Saint-Jean", "Abitibi-Témiscamingue", "Côte-Nord",
  "Montérégie", "Chaudière-Appalaches", "Centre-du-Québec",
];

const REGION_SLUG_MAP: Record<string, string> = {
  "Charlevoix": "charlevoix",
  "Estrie (Cantons-de-l'Est)": "cantons-de-lest",
  "Gaspésie": "gaspesie",
  "Lanaudière": "lanaudiere",
  "Laurentides": "laurentides",
  "Mauricie": "mauricie",
  "Outaouais": "outaouais",
  "Québec (ville et région)": "capitale-nationale",
  "Saguenay–Lac-Saint-Jean": "saguenay-lac-saint-jean",
  "Abitibi-Témiscamingue": "abitibi-temiscamingue",
  "Côte-Nord": "cote-nord",
  "Montérégie": "monteregie",
  "Chaudière-Appalaches": "chaudiere-appalaches",
};

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_SHORT = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];
const DAYS_FR = ["dim","lun","mar","mer","jeu","ven","sam"];

type DestItem = { label: string; type: "region" | "city"; value: string };
const RECENT_KEY = "kbl_recent_dest";

function loadRecent(): DestItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); }
  catch { return []; }
}
function saveRecent(item: DestItem) {
  try {
    const prev = loadRecent().filter((r) => !(r.type === item.type && r.value === item.value));
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, 5)));
  } catch { /* noop */ }
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatShort(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}
function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────

function CalendarMonth({
  year, month, today, checkin, checkout, hoverDate,
  onDayClick, onDayEnter, onDayLeave,
  showPrev, showNext, onPrev, onNext,
}: {
  year: number; month: number; today: string;
  checkin: string; checkout: string; hoverDate: string;
  onDayClick: (d: string) => void; onDayEnter: (d: string) => void; onDayLeave: () => void;
  showPrev: boolean; showNext: boolean; onPrev: () => void; onNext: () => void;
}) {
  const days = getMonthGrid(year, month);
  const effectiveEnd = checkout || (checkin && hoverDate > checkin ? hoverDate : "");
  return (
    <div className="select-none w-[252px]">
      <div className="flex items-center mb-4">
        <button onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-charcoal-800">{MONTHS_FR[month]} {year}</p>
        <button onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-[11px] font-medium text-charcoal-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-9" />;
          const ds = toISO(year, month, day);
          const isPast = ds < today;
          const isStart = ds === checkin;
          const isEnd = ds === checkout;
          const isHoverEnd = !checkout && !!checkin && ds === hoverDate && ds > checkin;
          const inRange = !!checkin && !!effectiveEnd && ds > checkin && ds < effectiveEnd;
          const hasRange = !!(checkin && effectiveEnd);
          return (
            <div key={ds} className="relative h-9 flex items-center justify-center">
              {isStart && hasRange && <div className="absolute inset-y-1 left-1/2 right-0 bg-primary/10" />}
              {(isEnd || isHoverEnd) && <div className="absolute inset-y-1 left-0 right-1/2 bg-primary/10" />}
              {inRange && <div className="absolute inset-y-1 left-0 right-0 bg-primary/10" />}
              <button
                disabled={isPast}
                onClick={() => !isPast && onDayClick(ds)}
                onMouseEnter={() => !isPast && onDayEnter(ds)}
                onMouseLeave={onDayLeave}
                className={["relative z-10 w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all",
                  isPast ? "text-charcoal-300 cursor-not-allowed" :
                  isStart || isEnd ? "bg-primary text-white font-semibold shadow-sm" :
                  isHoverEnd ? "bg-primary/25 text-primary font-medium" :
                  "hover:bg-charcoal-50 text-charcoal-800 cursor-pointer"].join(" ")}
              >{day}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NavSearchBarInner ─────────────────────────────────────────────────────────

function NavSearchBarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const initRegion = searchParams.get("region") ?? "";
  const initCity = searchParams.get("city") ?? "";
  const initCheckin = searchParams.get("checkin") ?? "";
  const initCheckout = searchParams.get("checkout") ?? "";
  const initCapacity = searchParams.get("capacity") ?? "";
  const initPetsParam = searchParams.get("pets") ?? "";
  const initMinBedrooms = searchParams.get("minBedrooms") ?? undefined;
  const initMinBeds = searchParams.get("minBeds") ?? undefined;
  const initMinBathrooms = searchParams.get("minBathrooms") ?? undefined;
  const initAmenities = searchParams.get("amenities") ?? undefined;

  const [destInput, setDestInput] = useState(initRegion || initCity);
  const [destSelected, setDestSelected] = useState<DestItem | null>(
    initRegion ? { label: initRegion, type: "region", value: initRegion }
    : initCity ? { label: initCity, type: "city", value: initCity }
    : null
  );
  const [checkin, setCheckin] = useState(initCheckin);
  const [checkout, setCheckout] = useState(initCheckout);
  const [adults, setAdults] = useState(parseInt(initCapacity) || 0);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [pets, setPets] = useState(parseInt(initPetsParam) || 0);
  const [activeField, setActiveField] = useState<"dest" | "dates" | "guests" | null>(null);
  const [hoverDate, setHoverDate] = useState("");
  const [leftYear, setLeftYear] = useState(now.getFullYear());
  const [leftMonth, setLeftMonth] = useState(now.getMonth());
  const [cities, setCities] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<DestItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/listings/locations").then(r => r.json()).then(d => setCities(d.cities ?? [])).catch(() => {});
    setRecentSearches(loadRecent());
  }, []);

  useEffect(() => {
    if (!activeField) return;
    const h = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setActiveField(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [activeField]);

  const suggestions = useMemo<DestItem[]>(() => {
    const q = destInput.trim().toLowerCase();
    if (!q) return [];
    const regionHits = REGIONS.filter(r => r.toLowerCase().includes(q)).slice(0, 4).map(r => ({ label: r, type: "region" as const, value: r }));
    const cityHits = cities.filter(c => c.toLowerCase().includes(q)).slice(0, 4).map(c => ({ label: c, type: "city" as const, value: c }));
    return [...regionHits, ...cityHits];
  }, [destInput, cities]);

  const handleDestSelect = (item: DestItem) => {
    setDestSelected(item);
    setDestInput(item.label);
    saveRecent(item);
    setRecentSearches(loadRecent());
    setActiveField("dates");
  };

  const handleSearch = () => {
    setActiveField(null);
    const active = destSelected ?? (() => {
      const q = destInput.trim();
      if (!q) return null;
      const regionMatch = REGIONS.find(r => r.toLowerCase() === q.toLowerCase());
      if (regionMatch) return { label: regionMatch, type: "region" as const, value: regionMatch };
      return { label: q, type: "city" as const, value: q };
    })();

    if (active?.type === "region" && !checkin && !checkout && adults === 0 && children === 0 && babies === 0 && pets === 0) {
      const slug = REGION_SLUG_MAP[active.value];
      if (slug) { router.push(`/chalets/${slug}`); return; }
    }

    const params = new URLSearchParams();
    if (active) {
      if (active.type === "region") params.set("region", active.value);
      else params.set("city", active.value);
    }
    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    const totalCapacity = adults + children + babies;
    if (totalCapacity > 0) params.set("capacity", String(totalCapacity));
    if (pets > 0) params.set("pets", String(pets));
    router.push(`/chalets${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
  const canGoPrev = leftYear > now.getFullYear() || (leftYear === now.getFullYear() && leftMonth > now.getMonth());
  const goPrev = () => leftMonth === 0 ? (setLeftYear(y => y - 1), setLeftMonth(11)) : setLeftMonth(m => m - 1);
  const goNext = () => leftMonth === 11 ? (setLeftYear(y => y + 1), setLeftMonth(0)) : setLeftMonth(m => m + 1);

  const handleDayClick = (ds: string) => {
    if (!checkin || (checkin && checkout)) { setCheckin(ds); setCheckout(""); }
    else if (ds > checkin) { setCheckout(ds); setActiveField(null); setHoverDate(""); }
    else { setCheckin(ds); setCheckout(""); }
  };

  const destLabel = destSelected?.label ?? null;
  const datesLabel = checkin ? `${formatShort(checkin)}${checkout ? ` – ${formatShort(checkout)}` : ""}` : null;
  const totalGuests = adults + children + babies;
  const guestsLabel = totalGuests > 0 ? `${totalGuests} voy.` : null;
  const popularRegions: DestItem[] = REGIONS.slice(0, 5).map(r => ({ label: r, type: "region", value: r }));

  const filtersCurrentParams = {
    region: initRegion || undefined,
    city: initCity || undefined,
    checkin: initCheckin || undefined,
    checkout: initCheckout || undefined,
    capacity: initCapacity || undefined,
  };

  return (
    <>
      {/* Mobile: loupe + filtres */}
      <div className="md:hidden flex items-center gap-1">
        <button
          className="p-2 text-charcoal-500 hover:text-charcoal-800 transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Rechercher"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <FiltersModal
          currentParams={filtersCurrentParams}
          initialMinBedrooms={initMinBedrooms}
          initialMinBeds={initMinBeds}
          initialMinBathrooms={initMinBathrooms}
          initialAmenities={initAmenities}
        />
      </div>

      {/* Desktop: pill + filtres ──────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-3">
      <div
        ref={containerRef}
        className="flex items-center border border-[#dddddd] rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
      >
        {/* ── Destination ── */}
        <div className="relative">
          <button
            onClick={() => setActiveField(activeField === "dest" ? null : "dest")}
            className={`flex items-center px-5 py-3 rounded-full transition-colors min-w-[130px] ${activeField === "dest" ? "bg-charcoal-50" : "hover:bg-charcoal-50/60"}`}
          >
            <span className={`text-sm font-medium leading-none truncate max-w-[120px] ${destLabel ? "text-charcoal-700" : "text-charcoal-400"}`}>
              {destLabel ?? "Destination"}
            </span>
          </button>

          {activeField === "dest" && (
            <div className="absolute top-[calc(100%+8px)] left-0 bg-white rounded-2xl shadow-xl border border-[#ebebeb] z-[9999] w-[300px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#ebebeb]">
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => { setDestInput(e.target.value); setDestSelected(null); }}
                  placeholder="Région ou ville..."
                  autoFocus
                  className="w-full text-sm outline-none text-charcoal-700 placeholder-charcoal-400"
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {!destInput.trim() ? (
                  <>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wide">
                        {recentSearches.length > 0 ? "Récents" : "Régions populaires"}
                      </p>
                    </div>
                    {(recentSearches.length > 0 ? recentSearches : popularRegions).map((item, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-charcoal-50 text-left transition-colors"
                      >
                        <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {recentSearches.length > 0
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal-800 truncate">{item.label}</p>
                          <p className="text-xs text-charcoal-400">{item.type === "region" ? "Région" : "Ville"}</p>
                        </div>
                      </button>
                    ))}
                  </>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-charcoal-50 text-left transition-colors"
                    >
                      <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm text-charcoal-800 truncate">{item.label}</p>
                        <p className="text-xs text-charcoal-400">{item.type === "region" ? "Région" : "Ville"}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-5 text-sm text-charcoal-400 text-center">Aucune destination trouvée</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-[#ebebeb] shrink-0" />

        {/* ── Dates ── */}
        <div className="relative">
          <button
            onClick={() => setActiveField(activeField === "dates" ? null : "dates")}
            className={`flex items-center px-5 py-3 rounded-full transition-colors min-w-[120px] ${activeField === "dates" ? "bg-charcoal-50" : "hover:bg-charcoal-50/60"}`}
          >
            <span className={`text-sm font-medium leading-none ${datesLabel ? "text-charcoal-700" : "text-charcoal-400"}`}>
              {datesLabel ?? "Dates"}
            </span>
          </button>

          {activeField === "dates" && (
            <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-[#ebebeb] p-5 z-[9999]">
              <div className="flex gap-6">
                <CalendarMonth
                  year={leftYear} month={leftMonth} today={today}
                  checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                  onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                  showPrev={canGoPrev} showNext={false} onPrev={goPrev} onNext={goNext}
                />
                <div className="w-px bg-[#ebebeb]" />
                <CalendarMonth
                  year={rightYear} month={rightMonth} today={today}
                  checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                  onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                  showPrev={false} showNext onPrev={goPrev} onNext={goNext}
                />
              </div>
              {(checkin || checkout) && (
                <div className="mt-4 pt-3 border-t border-[#ebebeb] flex justify-end">
                  <button
                    onClick={() => { setCheckin(""); setCheckout(""); setHoverDate(""); }}
                    className="text-sm text-charcoal-500 hover:text-charcoal-800 underline underline-offset-2 transition-colors"
                  >
                    Effacer les dates
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-[#ebebeb] shrink-0" />

        {/* ── Voyageurs ── */}
        <div className="relative">
          <button
            onClick={() => setActiveField(activeField === "guests" ? null : "guests")}
            className={`flex items-center px-5 py-3 rounded-full transition-colors min-w-[110px] ${activeField === "guests" ? "bg-charcoal-50" : "hover:bg-charcoal-50/60"}`}
          >
            <span className={`text-sm font-medium leading-none ${guestsLabel ? "text-charcoal-700" : "text-charcoal-400"}`}>
              {guestsLabel ?? "Voyageurs"}
            </span>
          </button>

          {activeField === "guests" && (
            <div className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-2xl shadow-xl border border-[#ebebeb] z-[9999] w-[300px]">
              {([
                { label: "Adultes", sub: "13 ans et plus", val: adults, set: setAdults,
                  decrDis: adults === 0 || (adults === 1 && children + babies > 0), incrDis: totalGuests >= 24 },
                { label: "Enfants", sub: "De 2 à 12 ans", val: children, set: setChildren,
                  decrDis: children === 0, incrDis: totalGuests >= 24 },
                { label: "Bébés", sub: "Moins de 2 ans", val: babies, set: setBabies,
                  decrDis: babies === 0, incrDis: totalGuests >= 24 },
                { label: "Animaux", sub: "Chiens, chats, etc.", val: pets, set: setPets,
                  decrDis: pets === 0, incrDis: pets >= 5 },
              ] as Array<{ label: string; sub: string; val: number; set: React.Dispatch<React.SetStateAction<number>>; decrDis: boolean; incrDis: boolean }>).map(({ label, sub, val, set, decrDis, incrDis }, idx, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-charcoal-800">{label}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">{sub}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); set((v) => Math.max(0, v - 1)); }}
                        disabled={decrDis}
                        className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                      </button>
                      <span className="w-5 text-center text-sm font-medium text-charcoal-800">{val}</span>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); set((v) => v + 1); }}
                        disabled={incrDis}
                        className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                  {idx < arr.length - 1 && <div className="mx-5 border-t border-[#ebebeb]" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          aria-label="Rechercher"
          className="m-1.5 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shrink-0 hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Filtres button (desktop) */}
      <FiltersModal
        currentParams={filtersCurrentParams}
        initialMinBedrooms={initMinBedrooms}
        initialMinBeds={initMinBeds}
        initialMinBathrooms={initMinBathrooms}
        initialAmenities={initAmenities}
      />
      </div>{/* end desktop wrapper */}

      {/* Mobile full-screen overlay ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col md:hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ebebeb] shrink-0">
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-charcoal-700 font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center pt-8">
            <SearchBar
              initialRegion={destSelected?.type === "region" ? destSelected.value : undefined}
              initialCity={destSelected?.type === "city" ? destSelected.value : undefined}
              initialCheckin={checkin}
              initialCheckout={checkout}
              initialAdults={adults}
              initialChildren={children}
              initialBabies={babies}
              initialPets={pets}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── Export with Suspense ──────────────────────────────────────────────────────

export default function NavSearchBar() {
  return (
    <Suspense fallback={
      <div className="hidden md:block h-[52px] w-[430px] rounded-full border border-[#ebebeb] bg-white" />
    }>
      <NavSearchBarInner />
    </Suspense>
  );
}
