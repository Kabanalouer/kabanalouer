"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { getMonthNames, getMonthNamesShort, getDayNames } from "@/lib/dateLocale";

// Calendrier de sélection de plage de dates, commun au site (formulaire de
// demande de prix sur la fiche, promotions du tableau de bord hôte).

export function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function formatShort(iso: string, monthsShort: string[]) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${monthsShort[m - 1]}`;
}
function getGrid(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
}

export function CalendarMonth({
  year, month, today, checkin, checkout, hoverDate, blockedDates,
  onDayClick, onDayEnter, onDayLeave,
  showPrev, showNext, onPrev, onNext,
  monthNames, dayNames,
}: {
  year: number; month: number; today: string;
  checkin: string; checkout: string; hoverDate: string; blockedDates: Set<string>;
  onDayClick: (d: string) => void; onDayEnter: (d: string) => void; onDayLeave: () => void;
  showPrev: boolean; showNext: boolean; onPrev: () => void; onNext: () => void;
  monthNames: string[]; dayNames: string[];
}) {
  const days = getGrid(year, month);
  const effectiveEnd = checkout || (checkin && hoverDate > checkin ? hoverDate : "");
  return (
    <div className="select-none w-full">
      <div className="flex items-center mb-3">
        <button type="button" onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-charcoal-800">{monthNames[month]} {year}</p>
        <button type="button" onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-charcoal-50 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-xs font-medium text-charcoal-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-8" />;
          const ds = toISO(year, month, day);
          const isPast = ds < today;
          const isBlocked = !isPast && blockedDates.has(ds);
          const isDisabled = isPast || isBlocked;
          const isStart = ds === checkin;
          const isEnd = ds === checkout;
          const isHoverEnd = !checkout && !!checkin && ds === hoverDate && ds > checkin;
          const inRange = !!checkin && !!effectiveEnd && ds > checkin && ds < effectiveEnd;
          const hasRange = !!(checkin && effectiveEnd);
          return (
            <div key={ds} className="relative h-8 flex items-center justify-center">
              {isStart && hasRange && <div className="absolute inset-y-0.5 left-1/2 right-0 bg-primary/10" />}
              {(isEnd || isHoverEnd) && <div className="absolute inset-y-0.5 left-0 right-1/2 bg-primary/10" />}
              {inRange && <div className="absolute inset-y-0.5 left-0 right-0 bg-primary/10" />}
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onDayClick(ds)}
                onMouseEnter={() => !isDisabled && onDayEnter(ds)}
                onMouseLeave={onDayLeave}
                className={["relative z-10 w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all",
                  isPast ? "text-charcoal-200 cursor-not-allowed" :
                  isBlocked ? "text-charcoal-300 line-through cursor-not-allowed bg-charcoal-50" :
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

const NO_BLOCKED = new Set<string>();

// Champ « début / fin » qui ouvre le calendrier dans une fenêtre flottante
export function DateRangeField({
  start, end, onChange, startLabel, endLabel, placeholder, clearLabel,
}: {
  start: string; end: string;
  onChange: (start: string, end: string) => void;
  startLabel: string; endLabel: string; placeholder: string; clearLabel: string;
}) {
  const locale = useLocale();
  const monthNames = getMonthNames(locale);
  const monthNamesShort = getMonthNamesShort(locale);
  const dayNames = getDayNames(locale);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState("");
  const initial = start ? new Date(start + "T12:00:00") : now;
  const [calYear, setCalYear] = useState(initial.getFullYear());
  const [calMonth, setCalMonth] = useState(initial.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setHoverDate(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const canGoPrev = calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth > now.getMonth());
  const goPrev = () => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); };
  const goNext = () => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); };

  const handleDayClick = (ds: string) => {
    if (!start || (start && end)) onChange(ds, "");
    else if (ds > start) { onChange(start, ds); setOpen(false); setHoverDate(""); }
    else onChange(ds, "");
  };

  return (
    <div ref={ref} className="relative max-w-sm">
      <div className="grid grid-cols-2 rounded-xl border border-[#ebebeb] overflow-hidden bg-white">
        {[{ label: startLabel, value: start }, { label: endLabel, value: end }].map(({ label, value }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-charcoal-50 transition-colors ${i === 0 ? "border-r border-[#ebebeb]" : ""}`}
          >
            <span className="text-xs font-medium text-charcoal-400">{label}</span>
            <span className={`text-sm ${value ? "text-charcoal-800 font-medium" : "text-charcoal-300"}`}>
              {value ? formatShort(value, monthNamesShort) : placeholder}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-[#ebebeb] p-4 z-50 w-full">
          <CalendarMonth
            year={calYear} month={calMonth} today={today}
            checkin={start} checkout={end} hoverDate={hoverDate} blockedDates={NO_BLOCKED}
            onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
            showPrev={canGoPrev} showNext onPrev={goPrev} onNext={goNext}
            monthNames={monthNames} dayNames={dayNames}
          />
          {(start || end) && (
            <div className="mt-3 pt-2.5 border-t border-[#ebebeb] flex justify-end">
              <button
                type="button"
                onClick={() => { onChange("", ""); setHoverDate(""); }}
                className="text-sm text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2"
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
