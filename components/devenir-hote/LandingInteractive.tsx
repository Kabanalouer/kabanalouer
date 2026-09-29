"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { normalizeAirbnbInput, savePendingAirbnbImport } from "@/lib/pendingAirbnbImport";
import type { DevenirHoteContent, Faq } from "@/lib/devenirHoteContent";
import { NEW_LISTING_PATH, useOwnerAccess } from "./OwnerAccess";

export const HEADER_HEIGHT = 76;
const IMPORT_INPUT_ID = "airbnb-link";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function goToImportForm() {
  const section = document.getElementById("import");
  const input = document.getElementById(IMPORT_INPUT_ID) as HTMLInputElement | null;
  const reduce = prefersReducedMotion();
  if (section) {
    window.scrollTo({
      top: section.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT,
      behavior: reduce ? "auto" : "smooth",
    });
  }
  setTimeout(() => input?.focus({ preventScroll: true }), reduce ? 0 : 600);
}

export function ScrollToImportButton({
  emplacement,
  className,
  children,
}: {
  emplacement: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        trackEvent("lp_hote_dupliquer_airbnb", { emplacement });
        goToImportForm();
      }}
    >
      {children}
    </button>
  );
}

export function ImportForm({ c }: { c: DevenirHoteContent["importSection"] }) {
  const { navigate } = useOwnerAccess();
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeAirbnbInput(link);
    trackEvent("lp_hote_import_soumis", { valide: url !== null });
    if (!url) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    setSubmitting(true);
    savePendingAirbnbImport(url);
    navigate(`${NEW_LISTING_PATH}?import=${encodeURIComponent(url)}`);
    // Voyageur connecté : la fenêtre « Activer mon compte proprio » s'ouvre
    // et la page reste affichée — ne pas laisser le bouton bloqué.
    setTimeout(() => setSubmitting(false), 4000);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2.5 max-w-[580px]">
      <label htmlFor={IMPORT_INPUT_ID} className="text-sm font-bold text-charcoal-800">
        {c.label}
      </label>
      <div className="flex flex-wrap gap-2 bg-white border-[1.5px] border-charcoal-200 rounded-[32px] p-1.5 shadow-[var(--shadow-md)] focus-within:border-primary transition-colors">
        <div className="flex flex-[1_1_240px] items-center gap-2.5 px-3 min-w-0">
          <svg className="w-5 h-5 shrink-0 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            ref={inputRef}
            id={IMPORT_INPUT_ID}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={link}
            onChange={(e) => { setLink(e.target.value); setError(false); }}
            placeholder={c.placeholder}
            aria-invalid={error}
            aria-describedby={error ? "airbnb-link-error" : undefined}
            className="flex-1 min-w-0 h-12 bg-transparent border-0 outline-none text-base font-medium text-charcoal-800 placeholder:text-charcoal-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex-[0_0_auto] max-[420px]:flex-1 inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-full bg-primary text-white text-base font-bold transition-[background-color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary-dark active:scale-[0.97] disabled:opacity-70 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {c.submit}
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      {error && (
        <p id="airbnb-link-error" role="alert" className="m-0 text-sm font-semibold text-error-700">
          {c.error}
        </p>
      )}
    </form>
  );
}

function money(value: number, locale: string): string {
  const n = Math.round(value);
  return locale === "en"
    ? `$${n.toLocaleString("en-CA")}`
    : `${n.toLocaleString("fr-CA").replace(/\s/g, " ")} $`;
}

export function SavingsCalculator({ c, locale }: { c: DevenirHoteContent["calculator"]; locale: string }) {
  const [price, setPrice] = useState(250);
  const [nights, setNights] = useState(90);
  const trackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fees = price * nights * 0.15;

  // Un seul événement par réglage (après 1 s sans mouvement), pas un par cran du curseur.
  const scheduleTrack = (p: number, n: number) => {
    if (trackTimer.current) clearTimeout(trackTimer.current);
    trackTimer.current = setTimeout(() => {
      trackEvent("lp_hote_calculatrice", { prix_nuit: p, nuits: n, frais_evites: Math.round(p * n * 0.15) });
    }, 1000);
  };
  useEffect(() => () => { if (trackTimer.current) clearTimeout(trackTimer.current); }, []);

  const priceLabel = money(price, locale);
  const nightsLabel = `${nights} ${c.nightsUnit}`;
  const feesLabel = money(fees, locale);

  return (
    <div className="bg-white border border-charcoal-100 rounded-2xl shadow-[var(--shadow-lg)] p-[clamp(24px,3vw,36px)] flex flex-col gap-[26px]">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-xl font-bold tracking-[-0.02em] text-charcoal-800">{c.title}</h3>
        <p className="m-0 text-sm text-charcoal-400">{c.subtitle}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-[15px]">
          <label htmlFor="calc-price" className="font-semibold text-charcoal-600">{c.priceLabel}</label>
          <span className="font-extrabold text-charcoal-800" aria-hidden="true">{priceLabel}</span>
        </div>
        <input
          id="calc-price"
          type="range"
          min={100}
          max={800}
          step={10}
          value={price}
          aria-valuetext={priceLabel}
          onChange={(e) => { const v = +e.target.value; setPrice(v); scheduleTrack(v, nights); }}
          className="w-full accent-primary"
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-[15px]">
          <label htmlFor="calc-nights" className="font-semibold text-charcoal-600">{c.nightsLabel}</label>
          <span className="font-extrabold text-charcoal-800" aria-hidden="true">{nightsLabel}</span>
        </div>
        <input
          id="calc-nights"
          type="range"
          min={10}
          max={250}
          step={5}
          value={nights}
          aria-valuetext={nightsLabel}
          onChange={(e) => { const v = +e.target.value; setNights(v); scheduleTrack(price, v); }}
          className="w-full accent-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <div className="bg-charcoal-50 rounded-lg p-[18px] flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-charcoal-400">{c.commissionLabel}</span>
          <span className="text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.03em] text-error-700">{feesLabel}</span>
          <span className="text-xs text-charcoal-400">{c.commissionNote}</span>
        </div>
        <div className="bg-primary-50 border-[1.5px] border-primary-200 rounded-lg p-[18px] flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-primary-700">{c.kabanalouerLabel}</span>
          <span className="text-[clamp(22px,2.4vw,28px)] font-extrabold tracking-[-0.03em] text-primary-700">{money(0, locale)}</span>
          <span className="text-xs text-primary-600">{c.kabanalouerNote}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-charcoal-100 pt-5">
        <p className="m-0 text-[15px] text-charcoal-600">
          {c.pocketPre}
          <strong className="text-lg text-charcoal-800">{feesLabel}{c.pocketPost}</strong>
        </p>
        <ScrollToImportButton
          emplacement="calculatrice"
          className="bg-primary text-white text-[15px] font-bold px-[18px] py-3 rounded-full transition-[background-color,transform] duration-[140ms] hover:bg-primary-dark active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {c.cta}
        </ScrollToImportButton>
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col bg-white rounded-2xl px-7 max-sm:px-5 py-2 shadow-[var(--shadow-sm)]">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-charcoal-100 last:border-b-0">
            <h3 className="m-0">
              <button
                type="button"
                id={`faq-q-${i}`}
                aria-expanded={isOpen}
                aria-controls={`faq-a-${i}`}
                onClick={() => {
                  setOpen(isOpen ? -1 : i);
                  if (!isOpen) trackEvent("lp_hote_faq_ouverte", { question: item.q, position: i + 1 });
                }}
                className="w-full flex justify-between items-center gap-4 py-[22px] text-left text-[17px] font-bold tracking-[-0.01em] text-charcoal-800 bg-transparent border-0 cursor-pointer focus-visible:outline-none focus-visible:underline"
              >
                <span>{item.q}</span>
                <span className="shrink-0 text-2xl font-normal leading-none text-charcoal-400" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            {/* Réponses toujours dans le HTML (hidden) : lisibles par les moteurs et les IA. */}
            <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen}>
              <p className="m-0 mb-[22px] text-base leading-[1.65] text-charcoal-600 max-w-[680px] text-pretty">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StickyCta({ c }: { c: DevenirHoteContent["sticky"] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`min-[760px]:hidden fixed inset-x-0 bottom-0 z-[60] bg-white border-t border-charcoal-100 shadow-[var(--shadow-lg)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex items-center gap-3 transition-[transform,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[15px] font-extrabold text-charcoal-800">{c.title}</span>
        <span className="text-xs text-charcoal-400">{c.subtitle}</span>
      </div>
      <ScrollToImportButton
        emplacement="barre_mobile"
        className="h-12 px-[18px] rounded-full bg-primary text-white text-[15px] font-bold active:scale-[0.97] transition-transform"
      >
        {c.cta}
      </ScrollToImportButton>
    </div>
  );
}
