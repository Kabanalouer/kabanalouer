"use client";

import { useState, useCallback } from "react";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export type BlockedEntry = { date: string; source: "manual" | "ical" };
type RangePos = "start" | "end" | "middle" | "single";

const MANUAL_COLOR = "#FECACA"; // red-200
const ICAL_COLOR   = "#FDE68A"; // amber-200

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getRangePos(dateStr: string, allBlocked: Set<string>): RangePos {
  const hasPrev = allBlocked.has(offsetDate(dateStr, -1));
  const hasNext = allBlocked.has(offsetDate(dateStr, +1));
  if (!hasPrev && !hasNext) return "single";
  if (!hasPrev) return "start";
  if (!hasNext) return "end";
  return "middle";
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDatesInRange(a: string, b: string): string[] {
  const dates: string[] = [];
  const start = new Date((a < b ? a : b) + "T12:00:00Z");
  const end   = new Date((a < b ? b : a) + "T12:00:00Z");
  const cur   = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function BlockBg({ pos, color }: { pos: RangePos; color: string }) {
  if (pos === "middle") return <div className="absolute inset-0 rounded-xl" style={{ background: color }} />;
  if (pos === "start")  return <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-xl" style={{ background: color }} />;
  if (pos === "end")    return <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-xl" style={{ background: color }} />;
  // single: top-right + bottom-left triangles via two diagonal gradients
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top right, transparent 50%, ${color} 50%)` }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom left, transparent 50%, ${color} 50%)` }} />
    </div>
  );
}

function LegendItem({ type, color, label }: { type: "available" | "middle" | "start" | "end"; color?: string; label: string }) {
  const c = color ?? MANUAL_COLOR;
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-5 h-5 rounded-md border border-gray-200 overflow-hidden shrink-0 bg-white">
        {type === "middle" && <div className="absolute inset-0" style={{ background: c }} />}
        {type === "start"  && <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: c }} />}
        {type === "end"    && <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: c }} />}
      </div>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

export default function AvailabilityCalendar({
  listingId,
  initialBlocked,
}: {
  listingId: string;
  initialBlocked: BlockedEntry[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date();

  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [manualBlocked, setManualBlocked] = useState<Set<string>>(
    () => new Set(initialBlocked.filter((e) => e.source === "manual").map((e) => e.date))
  );
  const icalBlocked = new Set(
    initialBlocked.filter((e) => e.source === "ical").map((e) => e.date)
  );

  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [hoverDate,  setHoverDate]  = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

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
      if (allManualBlocked) dates.forEach((d) => next.delete(d));
      else                  dates.forEach((d) => next.add(d));
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

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const allBlocked     = new Set([...manualBlocked, ...icalBlocked]);

  const inPreviewRange = (dateStr: string) => {
    if (!rangeStart || !hoverDate) return false;
    const a = rangeStart < hoverDate ? rangeStart : hoverDate;
    const b = rangeStart < hoverDate ? hoverDate  : rangeStart;
    return dateStr >= a && dateStr <= b;
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

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} disabled={!canGoPrev} className="p-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} disabled={!canGoNext} className="p-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30">
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
      <div className="grid grid-cols-7 gap-1" onMouseLeave={() => rangeStart && setHoverDate(null)}>
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dateStr  = toDateStr(viewYear, viewMonth, day);
          const isPast   = dateStr < today;
          const isManual = manualBlocked.has(dateStr);
          const isIcal   = icalBlocked.has(dateStr) && !isManual;
          const isBlocked   = allBlocked.has(dateStr);
          const isRangeStart = dateStr === rangeStart;
          const inPreview    = inPreviewRange(dateStr);
          const rangePos     = isBlocked ? getRangePos(dateStr, allBlocked) : null;
          const blockColor   = isManual ? MANUAL_COLOR : ICAL_COLOR;

          return (
            <button
              key={day}
              onClick={() => !isPast && handleDayClick(dateStr)}
              onMouseEnter={() => !isPast && handleDayHover(dateStr)}
              disabled={isPast}
              className={[
                "aspect-square rounded-xl text-sm flex items-center justify-center transition-colors relative",
                isPast ? "cursor-not-allowed" : "cursor-pointer",
                isRangeStart ? "ring-2 ring-primary ring-offset-1" : "",
                !isBlocked && !isPast && !isRangeStart && !inPreview ? "hover:bg-primary-50" : "",
              ].join(" ")}
            >
              {isRangeStart && <div className="absolute inset-0 rounded-xl bg-primary" />}
              {!isRangeStart && rangePos && <BlockBg pos={rangePos} color={blockColor} />}
              {!isRangeStart && !isBlocked && inPreview && <div className="absolute inset-0 rounded-xl bg-primary-50" />}

              <span className={[
                "relative z-10",
                isPast        ? "text-gray-300" :
                isRangeStart  ? "text-white font-bold" :
                isManual      ? "text-red-700 font-semibold" :
                isIcal        ? "text-amber-700 font-semibold" :
                inPreview     ? "text-primary font-semibold" :
                                "text-gray-700",
              ].join(" ")}>
                {day}
              </span>

              {isIcal && (
                <span className="absolute bottom-0.5 right-0.5 text-[8px] text-amber-600 z-20">⟳</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-gray-100 text-xs">
        <LegendItem type="available" label="Disponible" />
        <LegendItem type="middle"    color={MANUAL_COLOR} label="Non disponible (manuel)" />
        <LegendItem type="middle"    color={ICAL_COLOR}   label="Synchronisé iCal" />
        <LegendItem type="start"     color={MANUAL_COLOR} label="Arrivée" />
        <LegendItem type="end"       color={MANUAL_COLOR} label="Départ" />
      </div>
    </div>
  );
}
