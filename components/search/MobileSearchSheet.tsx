"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarMonth } from "@/components/DateRangePicker";
import { getMonthNames, getDayNames } from "@/lib/dateLocale";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import DestinationList from "./DestinationList";
import { formatShortDate, type SearchForm } from "./useSearchForm";

// Feuille de recherche plein écran des téléphones (< 768px) : destination,
// dates et voyageurs en sections repliables, barre d'actions collée en bas.
// Même état et même URL de recherche que la barre en ligne (useSearchForm).

export type SearchStep = "dest" | "dates" | "guests";

const NO_BLOCKED = new Set<string>();

function StepperButton({ onClick, disabled, label, children }: {
  onClick: () => void; disabled: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-11 h-11 rounded-full border border-charcoal-200 flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 active:bg-charcoal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

export default function MobileSearchSheet({
  form,
  initialStep,
  onClose,
}: {
  form: SearchForm;
  initialStep: SearchStep;
  onClose: () => void;
}) {
  const { t, locale, intlLocale } = form;
  const isEn = locale === "en";
  const [step, setStep] = useState<SearchStep>(initialStep);
  const monthNames = getMonthNames(locale);
  const dayNames = getDayNames(locale);
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const initialMonth = form.checkin ? new Date(form.checkin + "T12:00:00") : now;
  const [calYear, setCalYear] = useState(initialMonth.getFullYear());
  const [calMonth, setCalMonth] = useState(initialMonth.getMonth());
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (initialStep === "dest") inputRef.current?.focus();
    else closeRef.current?.focus();
  }, [initialStep]);

  const canGoPrev = calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth > now.getMonth());
  const goPrev = () => { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); };
  const goNext = () => { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1); };

  const destValue = form.destSelected ? form.displayLabel(form.destSelected) : form.destQuery.trim();
  const guestsValue = [
    form.guestsLabel,
    form.pets > 0 ? `${form.pets} ${form.pets > 1 ? (isEn ? "dogs" : "chiens") : (isEn ? "dog" : "chien")}` : null,
  ].filter(Boolean).join(", ");

  // Destination inconnue : on reste dans la feuille, sur l'étape Destination.
  const submit = async () => {
    const ok = await form.search();
    if (ok) onClose();
    else setStep("dest");
  };

  const collapsedRow = (s: SearchStep, label: string, value: string, placeholder: string) => (
    <button
      type="button"
      onClick={() => setStep(s)}
      className="w-full flex items-center justify-between gap-4 px-5 min-h-[56px] rounded-2xl bg-white border border-[#ebebeb] shadow-sm text-left"
    >
      <span className="text-sm font-medium text-charcoal-500 shrink-0">{label}</span>
      <span className={`text-sm truncate ${value ? "font-semibold text-charcoal-800" : "text-charcoal-400"}`}>{value || placeholder}</span>
    </button>
  );

  const sectionTitle = (label: string) => (
    <h3 className="text-heading-3 font-semibold text-charcoal-800 mb-3">{label}</h3>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("searchButton")}
      className="fixed inset-0 z-[10000] bg-charcoal-50 flex flex-col h-[100dvh]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* En-tête */}
      <div
        className="shrink-0 flex items-center gap-2 px-2 h-14 bg-charcoal-50"
        style={{ paddingLeft: "max(8px, env(safe-area-inset-left))", paddingRight: "max(8px, env(safe-area-inset-right))" }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={isEn ? "Close search" : "Fermer la recherche"}
          className="w-11 h-11 rounded-full bg-white border border-[#ebebeb] flex items-center justify-center text-charcoal-700 hover:bg-charcoal-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="flex-1 text-center text-base font-semibold text-charcoal-800 pr-11">{t("searchButton")}</p>
      </div>

      {/* Sections */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 space-y-3"
        style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}
      >
        {/* Destination */}
        {step === "dest" ? (
          <section className="rounded-2xl bg-white border border-[#ebebeb] shadow-sm p-4">
            {sectionTitle(t("destinationPlaceholder"))}
            <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-charcoal-200 focus-within:border-charcoal-800 transition-colors">
              <svg className="w-5 h-5 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                enterKeyHint="search"
                aria-label={t("destinationPlaceholder")}
                placeholder={t("regionOrCity")}
                value={form.destQuery}
                onChange={(e) => form.typeDest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  // Entrée choisit la première suggestion ; sans suggestion, on reste ici.
                  if (!form.destQuery.trim() || form.destSelected || form.pickHighlighted()) setStep("dates");
                }}
                className="flex-1 min-w-0 bg-transparent text-base outline-none text-charcoal-800 placeholder-charcoal-400"
              />
              {form.destQuery && (
                <button
                  type="button"
                  onClick={() => { form.clearDest(); inputRef.current?.focus(); }}
                  aria-label={isEn ? "Clear destination" : "Effacer la destination"}
                  className="-mr-3 w-11 h-11 flex items-center justify-center text-charcoal-400 hover:text-charcoal-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-2 -mx-2">
              <DestinationList
                form={form}
                variant="sheet"
                onPick={(item) => { form.selectDest(item); setStep("dates"); }}
              />
            </div>
          </section>
        ) : collapsedRow("dest", t("destinationPlaceholder"), destValue, isEn ? "Anywhere" : "N’importe où")}

        {/* Dates */}
        {step === "dates" ? (
          <section className="rounded-2xl bg-white border border-[#ebebeb] shadow-sm p-4">
            {sectionTitle(t("datesLabel"))}
            <CalendarMonth
              year={calYear} month={calMonth} today={today}
              checkin={form.checkin} checkout={form.checkout} hoverDate="" blockedDates={NO_BLOCKED}
              onDayClick={(ds) => { if (form.pickDay(ds)) setStep("guests"); }}
              onDayEnter={() => {}} onDayLeave={() => {}}
              showPrev={canGoPrev} showNext onPrev={goPrev} onNext={goNext}
              monthNames={monthNames} dayNames={dayNames}
            />
            <div className="mt-3 pt-3 border-t border-[#ebebeb] flex items-center justify-between gap-3 min-h-11">
              <span className="text-sm text-charcoal-500">
                {form.checkin && form.checkout
                  ? `${formatShortDate(form.checkin, intlLocale)} → ${formatShortDate(form.checkout, intlLocale)}`
                  : form.checkin
                  ? t("arrivalInfo", { date: formatShortDate(form.checkin, intlLocale) })
                  : isEn ? "Choose your check-in date" : "Choisissez votre date d’arrivée"}
              </span>
              {(form.checkin || form.checkout) && (
                <button
                  type="button"
                  onClick={form.clearDates}
                  className="shrink-0 min-h-11 px-2 text-sm font-medium text-charcoal-700 underline underline-offset-2"
                >
                  {t("clearDates")}
                </button>
              )}
            </div>
          </section>
        ) : collapsedRow("dates", t("datesLabel"), form.datesLabel ?? "", isEn ? "Add dates" : "Ajouter des dates")}

        {/* Voyageurs */}
        {step === "guests" ? (
          <section className="rounded-2xl bg-white border border-[#ebebeb] shadow-sm px-4 pt-4 pb-1">
            {sectionTitle(t("guestsPlaceholder"))}
            {form.guestRows.map(({ key, label, sub, val, onDecr, onIncr, decrDis, incrDis }, idx, arr) => (
              <div key={key} className={`flex items-center justify-between gap-4 py-4 ${idx < arr.length - 1 ? "border-b border-[#ebebeb]" : ""}`}>
                <div className="min-w-0">
                  <p className="text-base font-medium text-charcoal-800">{label}</p>
                  <p className="text-sm text-charcoal-400 mt-0.5">{sub}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StepperButton onClick={onDecr} disabled={decrDis} label={`${label}, ${isEn ? "decrease" : "diminuer"}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </StepperButton>
                  <span className="w-6 text-center text-base font-medium text-charcoal-800 tabular-nums" aria-live="polite">{val}</span>
                  <StepperButton onClick={onIncr} disabled={incrDis} label={`${label}, ${isEn ? "increase" : "augmenter"}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </StepperButton>
                </div>
              </div>
            ))}
          </section>
        ) : collapsedRow("guests", t("guestsPlaceholder"), guestsValue, isEn ? "Add travelers" : "Ajouter des voyageurs")}
      </div>

      {/* Barre d'actions */}
      <div
        className="shrink-0 bg-white border-t border-[#ebebeb] flex items-center justify-between gap-4 px-4 pt-3"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
        }}
      >
        <button
          type="button"
          onClick={() => { form.clearAll(); setStep("dest"); }}
          className="min-h-12 px-2 -ml-2 text-base font-semibold text-charcoal-800 underline underline-offset-2"
        >
          {t("clearDates")}
        </button>
        <button
          type="button"
          onClick={submit}
          className="h-12 px-6 bg-primary text-white rounded-full font-semibold text-base flex items-center gap-2 hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {t("searchButton")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
