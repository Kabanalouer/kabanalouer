"use client";

import { useState, useEffect } from "react";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MAX_OFFSET = 17;

const BLOCKED_COLOR = "#FECACA"; // red-200

type BlockedEntry = { date: string; source: "manual" | "ical" };
type RangePos = "start" | "end" | "middle" | "single";

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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

function BlockBg({ pos }: { pos: RangePos }) {
  const c = BLOCKED_COLOR;
  if (pos === "middle") return <div className="absolute inset-0 rounded" style={{ background: c }} />;
  if (pos === "start")  return <div className="absolute inset-y-0 right-0 w-1/2 rounded-r" style={{ background: c }} />;
  if (pos === "end")    return <div className="absolute inset-y-0 left-0 w-1/2 rounded-l" style={{ background: c }} />;
  return (
    <div className="absolute inset-0 rounded overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top right, transparent 50%, ${c} 50%)` }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom left, transparent 50%, ${c} 50%)` }} />
    </div>
  );
}

function MonthGrid({
  year,
  month,
  allBlocked,
  today,
}: {
  year: number;
  month: number;
  allBlocked: Set<string>;
  today: string;
}) {
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-charcoal-700 text-center mb-3 capitalize">
        {MONTH_NAMES[month]} {year}
      </h3>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-charcoal-200 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dateStr  = toDateStr(year, month, day);
          const isPast   = dateStr < today;
          const isBlocked = allBlocked.has(dateStr);
          const rangePos  = isBlocked ? getRangePos(dateStr, allBlocked) : null;

          return (
            <div
              key={day}
              className="aspect-square relative flex items-center justify-center"
            >
              {rangePos && <BlockBg pos={rangePos} />}
              <span className={[
                "relative z-10 text-[11px]",
                isPast    ? "text-charcoal-100" :
                isBlocked ? "text-red-500 font-medium" :
                            "text-charcoal-600",
              ].join(" ")}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AvailabilityView({ blocked }: { blocked: BlockedEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date();

  const allBlocked = new Set(blocked.map((e) => e.date));

  const [startOffset,   setStartOffset]   = useState(0);
  const [visibleCount,  setVisibleCount]  = useState(3);

  useEffect(() => {
    const update = () => setVisibleCount(window.innerWidth < 640 ? 1 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const canLeft  = startOffset > 0;
  const canRight = startOffset + visibleCount - 1 < MAX_OFFSET;

  const months = Array.from({ length: visibleCount }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + startOffset + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setStartOffset((o) => o - 1)}
          disabled={!canLeft}
          aria-label="Mois précédent"
          className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
        >
          <svg className="w-4 h-4 text-charcoal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setStartOffset((o) => o + 1)}
          disabled={!canRight}
          aria-label="Mois suivant"
          className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
        >
          <svg className="w-4 h-4 text-charcoal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex gap-8">
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            allBlocked={allBlocked}
            today={today}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-xs text-charcoal-400">
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded border border-[#ebebeb] overflow-hidden bg-white shrink-0" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-0" style={{ background: BLOCKED_COLOR }} />
          </div>
          Non disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: BLOCKED_COLOR }} />
          </div>
          Arrivée
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: BLOCKED_COLOR }} />
          </div>
          Départ
        </div>
      </div>

      {blocked.length === 0 && (
        <p className="text-xs text-primary mt-3 font-medium">
          Ce chalet est disponible pour toutes les dates — contactez le propriétaire pour confirmer.
        </p>
      )}
    </div>
  );
}
