"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── Static data ──────────────────────────────────────────────────────────────

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

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
const DAYS_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

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

// ── Calendar helpers ─────────────────────────────────────────────────────────

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

// ── CalendarMonth ────────────────────────────────────────────────────────────

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
        <button onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-gray-100 text-gray-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-gray-900">{MONTHS_FR[month]} {year}</p>
        <button onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-gray-100 text-gray-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">{d}</div>
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
                  isPast ? "text-gray-300 cursor-not-allowed" :
                  isStart || isEnd ? "bg-primary text-white font-semibold shadow-sm" :
                  isHoverEnd ? "bg-primary/25 text-primary font-medium" :
                  "hover:bg-gray-100 text-gray-800 cursor-pointer"].join(" ")}
              >{day}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SearchBar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  initialRegion?: string;
  initialCity?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialGuests?: string;
  iconOnly?: boolean;
  preserveParams?: Record<string, string>;
}

export default function SearchBar({
  initialRegion,
  initialCity,
  initialCheckin,
  initialCheckout,
  initialGuests,
  iconOnly = false,
  preserveParams,
}: SearchBarProps = {}) {
  const router = useRouter();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const initDest: DestItem | null = initialRegion
    ? { label: initialRegion, type: "region", value: initialRegion }
    : initialCity
    ? { label: initialCity, type: "city", value: initialCity }
    : null;

  // ── Destination state ──
  const [destQuery, setDestQuery] = useState(initDest?.label ?? "");
  const [destSelected, setDestSelected] = useState<DestItem | null>(initDest);
  const [destOpen, setDestOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<DestItem[]>([]);
  const destRef = useRef<HTMLDivElement>(null);

  // ── Calendar state ──
  const [checkin, setCheckin] = useState(initialCheckin ?? "");
  const [checkout, setCheckout] = useState(initialCheckout ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState("");
  const [leftYear, setLeftYear] = useState(now.getFullYear());
  const [leftMonth, setLeftMonth] = useState(now.getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);

  // ── Guests state ──
  const [guests, setGuests] = useState(initialGuests ?? "");
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  // Fetch cities from DB on mount
  useEffect(() => {
    fetch("/api/listings/locations")
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []))
      .catch(() => {});
  }, []);

  // Load recent searches from localStorage
  useEffect(() => { setRecentSearches(loadRecent()); }, []);

  // Close destination dropdown on outside click
  useEffect(() => {
    if (!destOpen) return;
    const h = (e: MouseEvent) => {
      if (!destRef.current?.contains(e.target as Node)) setDestOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [destOpen]);

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    const h = (e: MouseEvent) => {
      if (!calendarRef.current?.contains(e.target as Node)) {
        setCalendarOpen(false);
        setHoverDate("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [calendarOpen]);

  // Close guests dropdown on outside click
  useEffect(() => {
    if (!guestsOpen) return;
    const h = (e: MouseEvent) => {
      if (!guestsRef.current?.contains(e.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [guestsOpen]);

  // Autocomplete suggestions based on current query
  const suggestions = useMemo<DestItem[]>(() => {
    const q = destQuery.trim().toLowerCase();
    if (!q) return [];
    const regionHits = REGIONS
      .filter((r) => r.toLowerCase().includes(q))
      .slice(0, 4)
      .map((r) => ({ label: r, type: "region" as const, value: r }));
    const cityHits = cities
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 6)
      .map((c) => ({ label: c, type: "city" as const, value: c }));
    return [...regionHits, ...cityHits];
  }, [destQuery, cities]);

  const handleDestSelect = (item: DestItem) => {
    setDestSelected(item);
    setDestQuery(item.label);
    setDestOpen(false);
    saveRecent(item);
    setRecentSearches(loadRecent());
  };

  const clearDest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDestSelected(null);
    setDestQuery("");
    setDestOpen(false);
  };

  // Calendar helpers
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
  const canGoPrev = leftYear > now.getFullYear() || (leftYear === now.getFullYear() && leftMonth > now.getMonth());
  const goPrev = () => { if (leftMonth === 0) { setLeftYear((y) => y - 1); setLeftMonth(11); } else setLeftMonth((m) => m - 1); };
  const goNext = () => { if (leftMonth === 11) { setLeftYear((y) => y + 1); setLeftMonth(0); } else setLeftMonth((m) => m + 1); };

  const handleDayClick = (ds: string) => {
    if (!checkin || (checkin && checkout)) { setCheckin(ds); setCheckout(""); }
    else if (ds > checkin) { setCheckout(ds); setCalendarOpen(false); setHoverDate(""); }
    else { setCheckin(ds); setCheckout(""); }
  };
  const clearDates = () => { setCheckin(""); setCheckout(""); setHoverDate(""); };

  const datesLabel = checkin
    ? `${formatShort(checkin)} → ${checkout ? formatShort(checkout) : "Départ"}`
    : null;

  const handleSearch = () => {
    const params = new URLSearchParams();

    // Destination: if user typed but didn't click a suggestion, try to match
    const active = destSelected ?? (() => {
      const q = destQuery.trim();
      if (!q) return null;
      const regionMatch = REGIONS.find((r) => r.toLowerCase() === q.toLowerCase());
      if (regionMatch) return { label: regionMatch, type: "region" as const, value: regionMatch };
      return { label: q, type: "city" as const, value: q };
    })();
    if (active) {
      if (active.type === "region") params.set("region", active.value);
      else params.set("city", active.value);
    }

    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    if (guests) params.set("capacity", guests === "25+" ? "25" : guests);
    if (preserveParams) {
      for (const [k, v] of Object.entries(preserveParams)) {
        if (v) params.set(k, v);
      }
    }
    router.push(`/chalets${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Popular regions for empty-query state (no recent searches)
  const popularRegions: DestItem[] = REGIONS.slice(0, 5).map((r) => ({ label: r, type: "region", value: r }));

  const showDropdown = destOpen && !calendarOpen;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2 w-full max-w-3xl">

      {/* ── Field 1: Destination ─────────────────────────────────────────── */}
      <div ref={destRef} className="relative flex-1 min-w-[180px] flex">
        <div className="flex-1 flex items-center gap-3 px-4 py-2">
          {/* Pin icon */}
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            placeholder="Destination"
            value={destQuery}
            onFocus={() => setDestOpen(true)}
            onChange={(e) => {
              setDestQuery(e.target.value);
              setDestSelected(null);
              setDestOpen(true);
            }}
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 min-w-0"
          />
          {destQuery && (
            <button onClick={clearDest} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] w-full min-w-[280px] max-h-[220px] overflow-y-auto">
            {!destQuery.trim() ? (
              /* No query: show recent searches or popular regions */
              recentSearches.length > 0 ? (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Recherches récentes</p>
                  </div>
                  {recentSearches.map((item, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.type === "region" ? "Région" : "Ville"}</p>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Régions populaires</p>
                  </div>
                  {popularRegions.map((item) => (
                    <button
                      key={item.value}
                      onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-800">{item.label}</span>
                    </button>
                  ))}
                </>
              )
            ) : (
              /* Query typed: show autocomplete */
              suggestions.length > 0 ? (
                <>
                  {/* Regions group */}
                  {suggestions.filter((s) => s.type === "region").length > 0 && (
                    <>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Régions</p>
                      </div>
                      {suggestions.filter((s) => s.type === "region").map((item) => (
                        <button
                          key={item.value}
                          onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span className="text-sm text-gray-800">{item.label}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {/* Cities group */}
                  {suggestions.filter((s) => s.type === "city").length > 0 && (
                    <>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Villes</p>
                      </div>
                      {suggestions.filter((s) => s.type === "city").map((item) => (
                        <button
                          key={item.value}
                          onMouseDown={(e) => { e.preventDefault(); handleDestSelect(item); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-800">{item.label}</span>
                        </button>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="px-4 py-5 text-center text-sm text-gray-400">Aucune destination trouvée</div>
              )
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:block w-px bg-gray-100 self-stretch" />

      {/* ── Field 2: Dates ───────────────────────────────────────────────── */}
      <div ref={calendarRef} className="relative flex-1 min-w-[180px] flex">
        <button
          onClick={() => { setCalendarOpen((o) => !o); setDestOpen(false); }}
          className="flex-1 flex items-center gap-3 px-4 py-2 text-left"
        >
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-sm ${datesLabel ? "text-gray-700" : "text-gray-400"}`}>
            {datesLabel ?? "Dates"}
          </span>
        </button>

        {calendarOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-[9999] w-[min(calc(100vw-32px),580px)]">
            <div className="flex flex-col sm:flex-row gap-5">
              <CalendarMonth
                year={leftYear} month={leftMonth}
                today={today} checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                showPrev={canGoPrev} showNext={false} onPrev={goPrev} onNext={goNext}
              />
              <div className="hidden sm:block w-px bg-gray-100" />
              <CalendarMonth
                year={rightYear} month={rightMonth}
                today={today} checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                showPrev={false} showNext onPrev={goPrev} onNext={goNext}
              />
            </div>
            {(checkin || checkout) && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {checkin && checkout
                    ? `${formatShort(checkin)} → ${formatShort(checkout)}`
                    : checkin ? `Arrivée : ${formatShort(checkin)} · Choisissez le départ` : ""}
                </span>
                <button onClick={clearDates} className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors">
                  Effacer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:block w-px bg-gray-100 self-stretch" />

      {/* ── Field 3: Voyageurs ───────────────────────────────────────────── */}
      <div ref={guestsRef} className="relative flex items-center gap-3 px-4 py-2 min-w-[150px]">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <button
          onClick={() => { setGuestsOpen((o) => !o); setDestOpen(false); setCalendarOpen(false); }}
          className={`bg-transparent outline-none text-sm text-left flex-1 cursor-pointer ${guests ? "text-gray-700" : "text-gray-400"}`}
        >
          {guests
            ? guests === "25+" ? "25 voyageurs et +" : `${guests} voyageur${parseInt(guests) > 1 ? "s" : ""}`
            : "Voyageurs"}
        </button>

        {guestsOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] w-[210px] max-h-[220px] overflow-y-auto">
            <button
              onMouseDown={(e) => { e.preventDefault(); setGuests(""); setGuestsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Voyageurs
            </button>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onMouseDown={(e) => { e.preventDefault(); setGuests(String(n)); setGuestsOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${guests === String(n) ? "text-primary font-semibold" : "text-gray-800"}`}
              >
                {n} voyageur{n > 1 ? "s" : ""}
              </button>
            ))}
            <button
              onMouseDown={(e) => { e.preventDefault(); setGuests("25+"); setGuestsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${guests === "25+" ? "text-primary font-semibold" : "text-gray-800"}`}
            >
              25 voyageurs et +
            </button>
          </div>
        )}
      </div>

      {/* ── Search button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleSearch}
        aria-label="Rechercher"
        className={`bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center shrink-0 ml-4 ${iconOnly ? "p-3.5" : "px-5 py-3 gap-2 font-semibold"}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {!iconOnly && <span>Rechercher</span>}
      </button>
    </div>
  );
}
