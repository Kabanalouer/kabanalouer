"use client";

import { useState, useCallback } from "react";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type BlockedEntry = { date: string; source: "manual" | "ical" };

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDatesInRange(a: string, b: string): string[] {
  const dates: string[] = [];
  const start = new Date((a < b ? a : b) + "T12:00:00Z");
  const end = new Date((a < b ? b : a) + "T12:00:00Z");
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function AvailabilityCalendar({
  listingId,
  initialBlocked,
}: {
  listingId: string;
  initialBlocked: BlockedEntry[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // View state
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Blocked sets (manual and ical)
  const [manualBlocked, setManualBlocked] = useState<Set<string>>(
    () => new Set(initialBlocked.filter((e) => e.source === "manual").map((e) => e.date))
  );
  const icalBlocked = new Set(
    initialBlocked.filter((e) => e.source === "ical").map((e) => e.date)
  );

  // Range selection
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Save state
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Max date: 18 months from today
  const maxDate = new Date(now);
  maxDate.setMonth(maxDate.getMonth() + 18);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (new Date(nextY, nextM, 1) > maxDate) return;
    setViewMonth(nextM);
    setViewYear(nextY);
  };

  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;
  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(now.getFullYear(), now.getMonth(), 1);

  const handleDayClick = useCallback((dateStr: string) => {
    if (dateStr < today) return;

    if (rangeStart === null) {
      setRangeStart(dateStr);
      return;
    }

    const dates = getDatesInRange(rangeStart, dateStr).filter((d) => d >= today);
    const allManualBlocked = dates.every((d) => manualBlocked.has(d));

    setManualBlocked((prev) => {
      const next = new Set(prev);
      if (allManualBlocked) {
        dates.forEach((d) => next.delete(d));
      } else {
        dates.forEach((d) => next.add(d));
      }
      return next;
    });

    setRangeStart(null);
    setHoverDate(null);
    setIsDirty(true);
  }, [rangeStart, manualBlocked, today]);

  const handleDayHover = useCallback((dateStr: string) => {
    if (rangeStart !== null) setHoverDate(dateStr);
  }, [rangeStart]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/availability/${listingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: Array.from(manualBlocked) }),
      });
      setIsDirty(false);
      setSavedAt(new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setSaving(false);
    }
  };

  // Build calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  const inPreviewRange = (dateStr: string) => {
    if (!rangeStart || !hoverDate) return false;
    const a = rangeStart < hoverDate ? rangeStart : hoverDate;
    const b = rangeStart < hoverDate ? hoverDate : rangeStart;
    return dateStr >= a && dateStr <= b;
  };

  const getDayStyle = (dateStr: string, isPast: boolean) => {
    if (isPast) return "bg-gray-50 text-gray-300 cursor-not-allowed";
    if (dateStr === rangeStart) return "bg-primary text-white font-bold ring-2 ring-primary ring-offset-1";
    if (manualBlocked.has(dateStr)) return "bg-red-100 text-red-700 font-semibold hover:bg-red-200";
    if (icalBlocked.has(dateStr)) return "bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200";
    if (inPreviewRange(dateStr)) return "bg-primary-50 text-primary font-semibold";
    return "bg-white text-gray-700 hover:bg-primary-50 hover:text-primary cursor-pointer";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-gray-900">Calendrier de disponibilités</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {rangeStart
              ? "Cliquez une deuxième date pour sélectionner une plage"
              : "Cliquez une date pour la bloquer, ou sélectionnez une plage de deux clics"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !isDirty && (
            <span className="text-xs text-gray-400">Sauvegardé à {savedAt}</span>
          )}
          {rangeStart && (
            <button
              onClick={() => { setRangeStart(null); setHoverDate(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              Annuler sélection ×
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-5 text-xs">
        <LegendItem color="bg-white border border-gray-200" label="Disponible" />
        <LegendItem color="bg-red-100" label="Bloqué (manuel)" />
        <LegendItem color="bg-amber-100" label="Synchronisé iCal" />
        <LegendItem color="bg-primary-50" label="Sélection en cours" />
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid grid-cols-7 gap-1"
        onMouseLeave={() => rangeStart && setHoverDate(null)}
      >
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isPast = dateStr < today;

          return (
            <button
              key={day}
              onClick={() => !isPast && handleDayClick(dateStr)}
              onMouseEnter={() => !isPast && handleDayHover(dateStr)}
              disabled={isPast}
              className={`
                aspect-square rounded-xl text-sm flex flex-col items-center justify-center
                transition-colors relative
                ${getDayStyle(dateStr, isPast)}
              `}
            >
              <span>{day}</span>
              {icalBlocked.has(dateStr) && !manualBlocked.has(dateStr) && (
                <span className="absolute bottom-0.5 right-0.5 text-[8px] text-amber-500">⟳</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
        <span>
          <strong className="text-red-600">{manualBlocked.size}</strong> date{manualBlocked.size !== 1 ? "s" : ""} bloquée{manualBlocked.size !== 1 ? "s" : ""} manuellement
        </span>
        <span>
          <strong className="text-amber-600">{icalBlocked.size}</strong> date{icalBlocked.size !== 1 ? "s" : ""} synchronisée{icalBlocked.size !== 1 ? "s" : ""} iCal
        </span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-4 h-4 rounded-md ${color}`} />
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
