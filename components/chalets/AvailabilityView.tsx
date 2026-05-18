"use client";

import { useState, useEffect } from "react";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MAX_OFFSET = 17; // 18 months total, indices 0–17

type BlockedEntry = { date: string; source: "manual" | "ical" };

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MonthGrid({
  year,
  month,
  blockedDates,
  icalDates,
  today,
}: {
  year: number;
  month: number;
  blockedDates: Set<string>;
  icalDates: Set<string>;
  today: string;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-gray-700 text-center mb-3 capitalize">
        {MONTH_NAMES[month]} {year}
      </h3>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-300 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(year, month, day);
          const isPast = dateStr < today;
          const isManual = blockedDates.has(dateStr);
          const isIcal = icalDates.has(dateStr);

          let cls = "aspect-square rounded text-[11px] flex items-center justify-center ";
          if (isPast)        cls += "text-gray-200";
          else if (isManual) cls += "bg-red-50 text-red-400 font-medium";
          else if (isIcal)   cls += "bg-amber-50 text-amber-500 font-medium";
          else               cls += "text-gray-600";

          return <div key={day} className={cls}>{day}</div>;
        })}
      </div>
    </div>
  );
}

export default function AvailabilityView({ blocked }: { blocked: BlockedEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const blockedDates = new Set(blocked.filter((e) => e.source === "manual").map((e) => e.date));
  const icalDates    = new Set(blocked.filter((e) => e.source === "ical").map((e) => e.date));

  const [startOffset, setStartOffset] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

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
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-gray-50"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => setStartOffset((o) => o + 1)}
          disabled={!canRight}
          aria-label="Mois suivant"
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-gray-50"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            blockedDates={blockedDates}
            icalDates={icalDates}
            today={today}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-100" />
          Indisponible
        </div>
        {icalDates.size > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-100" />
            Réservé (calendrier ext.)
          </div>
        )}
      </div>

      {blocked.length === 0 && (
        <p className="text-xs text-primary mt-3 font-medium">
          Ce chalet est disponible pour toutes les dates — contactez l&apos;hôte pour confirmer.
        </p>
      )}
    </div>
  );
}
