"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchForm, formatShortDate, type DestItem, type SearchFormInit } from "@/components/search/useSearchForm";
import DestinationList from "@/components/search/DestinationList";
import MobileSearchSheet, { type SearchStep } from "@/components/search/MobileSearchSheet";

// ── Calendar helpers ─────────────────────────────────────────────────────────

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  showPrev, showNext, onPrev, onNext, locale,
}: {
  year: number; month: number; today: string;
  checkin: string; checkout: string; hoverDate: string;
  onDayClick: (d: string) => void; onDayEnter: (d: string) => void; onDayLeave: () => void;
  showPrev: boolean; showNext: boolean; onPrev: () => void; onNext: () => void;
  locale: string;
}) {
  const intlLocale = locale === "en" ? "en-CA" : "fr-CA";
  const monthHeader = new Date(year, month, 1).toLocaleDateString(intlLocale, { month: "long", year: "numeric" });
  const dayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2025, 0, 5 + i).toLocaleDateString(intlLocale, { weekday: "short" }).replace(".", "")
  );
  const days = getMonthGrid(year, month);
  const effectiveEnd = checkout || (checkin && hoverDate > checkin ? hoverDate : "");

  return (
    <div className="select-none w-[252px]">
      <div className="flex items-center mb-4">
        <button onClick={onPrev} className={`p-1.5 rounded-lg transition-colors ${showPrev ? "hover:bg-charcoal-100 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-charcoal-900 capitalize">{monthHeader}</p>
        <button onClick={onNext} className={`p-1.5 rounded-lg transition-colors ${showNext ? "hover:bg-charcoal-100 text-charcoal-600" : "invisible"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-xs font-medium text-charcoal-400 uppercase tracking-wide">{d}</div>
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
                  "hover:bg-charcoal-100 text-charcoal-800 cursor-pointer"].join(" ")}
              >{day}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PIN_ICON = <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CAL_ICON = <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const USERS_ICON = <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// ── SearchBar ────────────────────────────────────────────────────────────────

interface SearchBarProps extends SearchFormInit {
  iconOnly?: boolean;
  // Téléphones seulement : ouvre directement la feuille plein écran, sans
  // afficher la barre (utilisé par la barre compacte de /chalets).
  autoOpenSheet?: boolean;
  onSheetClose?: () => void;
}

export default function SearchBar({
  iconOnly = false,
  autoOpenSheet = false,
  onSheetClose,
  ...init
}: SearchBarProps = {}) {
  const form = useSearchForm(init);
  const { t, locale, intlLocale, destQuery, checkin, checkout, datesLabel, guestsLabel, guestRows } = form;
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // ── Popovers (tablette et ordinateur) ──
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState("");
  const [leftYear, setLeftYear] = useState(now.getFullYear());
  const [leftMonth, setLeftMonth] = useState(now.getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  // ── Feuille plein écran (téléphones) ──
  const [sheetStep, setSheetStep] = useState<SearchStep | null>(autoOpenSheet ? "dest" : null);
  const closeSheet = () => {
    setSheetStep(null);
    onSheetClose?.();
  };

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

  const handleDestSelect = (item: DestItem) => {
    form.selectDest(item);
    setDestOpen(false);
  };

  const clearDest = (e: React.MouseEvent) => {
    e.stopPropagation();
    form.clearDest();
    setDestOpen(false);
  };

  // Calendar helpers
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;
  const canGoPrev = leftYear > now.getFullYear() || (leftYear === now.getFullYear() && leftMonth > now.getMonth());
  const goPrev = () => { if (leftMonth === 0) { setLeftYear((y) => y - 1); setLeftMonth(11); } else setLeftMonth((m) => m - 1); };
  const goNext = () => { if (leftMonth === 11) { setLeftYear((y) => y + 1); setLeftMonth(0); } else setLeftMonth((m) => m + 1); };

  const handleDayClick = (ds: string) => {
    if (form.pickDay(ds)) { setCalendarOpen(false); setHoverDate(""); }
  };
  const clearDates = () => { form.clearDates(); setHoverDate(""); };

  const handleCalendarToggle = () => {
    setCalendarOpen((o) => !o);
    setDestOpen(false);
  };

  const handleSearch = form.search;

  const showDropdown = destOpen && !calendarOpen;

  const sheet = sheetStep && (
    <MobileSearchSheet form={form} initialStep={sheetStep} onClose={closeSheet} />
  );

  if (autoOpenSheet) return <>{sheet}</>;

  const phoneRow = (step: SearchStep, icon: React.ReactNode, value: string | null, placeholder: string, last = false) => (
    <button
      type="button"
      onClick={() => setSheetStep(step)}
      className={`w-full flex items-center gap-3 px-4 min-h-[52px] text-left active:bg-charcoal-50 transition-colors ${last ? "" : "border-b border-charcoal-100"}`}
    >
      {icon}
      <span className={`flex-1 min-w-0 truncate text-base ${value ? "text-charcoal-800" : "text-charcoal-400"}`}>
        {value || placeholder}
      </span>
    </button>
  );

  const destValue = form.destSelected ? form.displayLabel(form.destSelected) : destQuery.trim();
  const guestsValue = [
    guestsLabel,
    form.pets > 0 ? `${form.pets} ${form.pets > 1 ? (locale === "en" ? "dogs" : "chiens") : (locale === "en" ? "dog" : "chien")}` : null,
  ].filter(Boolean).join(", ");

  return (
    <>
    {/* ── Téléphones : rangées entièrement cliquables → feuille plein écran ── */}
    <div className="md:hidden bg-white rounded-2xl shadow-xl p-1.5 w-full">
      {phoneRow("dest", PIN_ICON, destValue, t("destinationPlaceholder"))}
      {phoneRow("dates", CAL_ICON, datesLabel, t("datesLabel"))}
      {phoneRow("guests", USERS_ICON, guestsValue, t("guestsPlaceholder"), true)}
      <button
        type="button"
        onClick={handleSearch}
        className="mt-1.5 w-full h-12 bg-primary text-white rounded-full font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {t("searchButton")}
      </button>
    </div>
    {sheet}

    {/* ── Tablette et ordinateur : barre en ligne et menus déroulants ── */}
    <div className="hidden md:flex bg-white rounded-2xl shadow-xl p-1.5 sm:p-2 flex-col sm:flex-row gap-1.5 sm:gap-2 w-full max-w-3xl">

      {/* ── Field 1: Destination ─────────────────────────────────────────── */}
      <div ref={destRef} className="relative flex-1 min-w-[180px] flex border-b border-charcoal-100 sm:border-b-0">
        <div className="flex-1 flex items-center gap-3 px-4 py-1.5 sm:py-2">
          {/* Pin icon */}
          <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            placeholder={t("destinationPlaceholder")}
            value={destQuery}
            onFocus={() => setDestOpen(true)}
            onChange={(e) => {
              form.typeDest(e.target.value);
              setDestOpen(true);
            }}
            className="flex-1 bg-transparent text-base outline-none text-charcoal-700 placeholder-charcoal-300 min-w-0"
          />
          {destQuery && (
            <button onClick={clearDest} className="text-charcoal-400 hover:text-charcoal-600 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-charcoal-100 z-[9999] w-full min-w-[280px] max-h-[220px] overflow-y-auto">
            <DestinationList form={form} variant="popover" onPick={handleDestSelect} />
          </div>
        )}
      </div>

      <div className="hidden sm:block w-px bg-charcoal-100 self-stretch" />

      {/* ── Field 2: Dates ───────────────────────────────────────────────── */}
      <div ref={calendarRef} className="relative flex-1 min-w-[180px] flex border-b border-charcoal-100 sm:border-b-0">
        <button
          onClick={handleCalendarToggle}
          className="flex-1 flex items-center gap-3 px-4 py-1.5 sm:py-2 text-left"
        >
          <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-sm ${datesLabel ? "text-charcoal-700" : "text-charcoal-400"}`}>
            {datesLabel ?? t("datesLabel")}
          </span>
        </button>

        {calendarOpen && (
          <>
            {/* Overlay — tap outside closes */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => { setCalendarOpen(false); setHoverDate(""); }}
            />

            {/* Calendrier — absolute ancré sous le champ Dates */}
            <div className="absolute top-full left-0 mt-2 rounded-2xl bg-white shadow-2xl border border-charcoal-100 p-5 z-[9999] overflow-y-auto max-h-[80vh]">

                {/* Desktop : 2 mois côte à côte */}
                <div className="flex gap-5">
                  <CalendarMonth
                    year={leftYear} month={leftMonth}
                    today={today} checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                    onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                    showPrev={canGoPrev} showNext={false} onPrev={goPrev} onNext={goNext}
                    locale={locale}
                  />
                  <div className="w-px bg-charcoal-100" />
                  <CalendarMonth
                    year={rightYear} month={rightMonth}
                    today={today} checkin={checkin} checkout={checkout} hoverDate={hoverDate}
                    onDayClick={handleDayClick} onDayEnter={setHoverDate} onDayLeave={() => setHoverDate("")}
                    showPrev={false} showNext onPrev={goPrev} onNext={goNext}
                    locale={locale}
                  />
                </div>
                {(checkin || checkout) && (
                  <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between">
                    <span className="text-sm text-charcoal-500">
                      {checkin && checkout
                        ? `${formatShortDate(checkin, intlLocale)} → ${formatShortDate(checkout, intlLocale)}`
                        : checkin ? t("arrivalInfo", { date: formatShortDate(checkin, intlLocale) }) : ""}
                    </span>
                    <button onClick={clearDates} className="text-sm text-charcoal-500 hover:text-charcoal-800 underline underline-offset-2 transition-colors">
                      {t("clearDates")}
                    </button>
                  </div>
                )}
              </div>
          </>
        )}
      </div>

      <div className="hidden sm:block w-px bg-charcoal-100 self-stretch" />

      {/* ── Field 3: Voyageurs ───────────────────────────────────────────── */}
      <div ref={guestsRef} className="relative flex items-center gap-3 px-4 py-1.5 sm:py-2 min-w-[150px]">
        <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <button
          onClick={() => { setGuestsOpen((o) => !o); setDestOpen(false); setCalendarOpen(false); }}
          className={`bg-transparent outline-none text-sm text-left flex-1 cursor-pointer truncate ${guestsLabel ? "text-charcoal-700" : "text-charcoal-400"}`}
        >
          {guestsLabel ?? t("guestsPlaceholder")}
        </button>

        {guestsOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-charcoal-100 z-[9999] w-[300px]">
            {guestRows.map(({ key, label, sub, val, onDecr, onIncr, decrDis, incrDis }, idx, arr) => (
              <div key={key}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="self-start text-left">
                    <p className="text-sm font-medium text-charcoal-800">{label}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">{sub}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onDecr}
                      disabled={decrDis}
                      className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <span className="w-5 text-center text-sm font-medium text-charcoal-800">{val}</span>
                    <button
                      type="button"
                      onClick={onIncr}
                      disabled={incrDis}
                      className="w-8 h-8 rounded-full border border-[#ebebeb] flex items-center justify-center text-charcoal-600 hover:border-charcoal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

      {/* ── Search button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleSearch}
        aria-label={t("searchAriaLabel")}
        className={`bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center shrink-0 ml-4 ${iconOnly ? "p-3.5" : "px-5 py-2.5 sm:py-3 gap-2 font-semibold"}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {!iconOnly && <span>{t("searchButton")}</span>}
      </button>
    </div>
    </>
  );
}
