"use client";

import { Fragment, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getMonthNames, getDayNames } from "@/lib/dateLocale";

const MAX_OFFSET = 17;

const BLOCKED_COLOR = "#FECACA"; // error-200

type BlockedEntry = { date: string; source: "manual" | "ical" };
// Chaque nuit bloquée D occupe la moitié droite de D (arrivée) et la moitié
// gauche de D+1 (départ) — le jour de départ reste disponible pour une arrivée.
type HalfFill = { left: boolean; right: boolean };

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Diagonale : arrivée = triangle bas-droite, départ = triangle haut-gauche
const CHECKIN_BG  = `linear-gradient(to bottom right, transparent 50%, ${BLOCKED_COLOR} 50%)`;
const CHECKOUT_BG = `linear-gradient(to bottom right, ${BLOCKED_COLOR} 50%, transparent 50%)`;

function BlockBg({ fill }: { fill: HalfFill }) {
  if (fill.left && fill.right) return <div className="absolute inset-0 rounded" style={{ background: BLOCKED_COLOR }} />;
  if (fill.right) return <div className="absolute inset-0 rounded" style={{ background: CHECKIN_BG }} />;
  if (fill.left)  return <div className="absolute inset-0 rounded" style={{ background: CHECKOUT_BG }} />;
  return null;
}

function MonthGrid({
  year,
  month,
  allBlocked,
  today,
  monthNames,
  dayNames,
}: {
  year: number;
  month: number;
  allBlocked: Set<string>;
  today: string;
  monthNames: string[];
  dayNames: string[];
}) {
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-base font-semibold text-charcoal-700 text-center mb-3 capitalize">
        {monthNames[month]} {year}
      </h3>

      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-charcoal-400 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dateStr  = toDateStr(year, month, day);
          const isPast   = dateStr < today;
          const isBlocked = allBlocked.has(dateStr);
          const fill: HalfFill = { left: allBlocked.has(offsetDate(dateStr, -1)), right: isBlocked };

          return (
            <div
              key={day}
              className="aspect-square relative flex items-center justify-center"
            >
              <BlockBg fill={fill} />
              <span className={[
                "relative z-10 text-xs",
                isPast ? "text-charcoal-100" : "text-charcoal-600",
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
  const t = useTranslations("availabilityView");
  const locale = useLocale();
  const monthNames = getMonthNames(locale);
  const dayNames = getDayNames(locale);
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
          aria-label={t("previousMonth")}
          className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
        >
          <svg className="w-4 h-4 text-charcoal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setStartOffset((o) => o + 1)}
          disabled={!canRight}
          aria-label={t("nextMonth")}
          className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center transition-opacity disabled:opacity-25 hover:enabled:bg-charcoal-50"
        >
          <svg className="w-4 h-4 text-charcoal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex gap-6">
        {months.map(({ year, month }, i) => (
          <Fragment key={`${year}-${month}`}>
            {i > 0 && <div className="w-px self-stretch bg-[#ebebeb]" aria-hidden />}
            <MonthGrid
              year={year}
              month={month}
              allBlocked={allBlocked}
              today={today}
              monthNames={monthNames}
              dayNames={dayNames}
            />
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-sm text-charcoal-400">
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded border border-[#ebebeb] overflow-hidden bg-white shrink-0" />
          {t("available")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-0" style={{ background: BLOCKED_COLOR }} />
          </div>
          {t("unavailable")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-0" style={{ background: CHECKIN_BG }} />
          </div>
          {t("checkin")}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative w-4 h-4 rounded overflow-hidden shrink-0 bg-white">
            <div className="absolute inset-0" style={{ background: CHECKOUT_BG }} />
          </div>
          {t("checkout")}
        </div>
      </div>

      {blocked.length === 0 && (
        <p className="text-sm text-primary mt-3 font-medium">
          {t("allAvailable")}
        </p>
      )}
    </div>
  );
}
