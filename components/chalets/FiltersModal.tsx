"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AMENITY_CATALOG } from "@/lib/amenities-catalog";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

function CounterRow({ label, value, onChange, max = 8, anyLabel, decreaseLabel, increaseLabel }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  anyLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const num = value ? parseInt(value) : 0;
  const atMin = num === 0;
  const atMax = num >= max;
  const display = num === 0 ? anyLabel : `${num}+`;

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-charcoal-800">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(num <= 1 ? "" : String(num - 1))}
          disabled={atMin}
          aria-label={decreaseLabel}
          className={`w-11 h-11 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center transition-colors ${
            atMin
              ? "border-[#ebebeb] text-charcoal-100 cursor-not-allowed"
              : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-800 hover:text-charcoal-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span className="w-8 text-center text-sm font-medium text-charcoal-800 tabular-nums" aria-live="polite">{display}</span>
        <button
          type="button"
          onClick={() => onChange(atMax ? String(max) : String(num + 1))}
          disabled={atMax}
          aria-label={increaseLabel}
          className={`w-11 h-11 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center transition-colors ${
            atMax
              ? "border-[#ebebeb] text-charcoal-100 cursor-not-allowed"
              : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-800 hover:text-charcoal-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange }: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-sm text-charcoal-800">{label}</span>
        <span className="block text-xs text-charcoal-400 mt-0.5">{sub}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span
        aria-hidden="true"
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${checked ? "bg-primary" : "bg-charcoal-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </label>
  );
}

interface FiltersModalProps {
  currentParams: {
    region?: string;
    city?: string;
    checkin?: string;
    checkout?: string;
    capacity?: string;
    dogs?: string;
    accessible?: string;
  };
  initialMinBedrooms?: string;
  initialMinBeds?: string;
  initialMinBathrooms?: string;
  initialAmenities?: string;
}

export default function FiltersModal({
  currentParams,
  initialMinBedrooms,
  initialMinBeds,
  initialMinBathrooms,
  initialAmenities,
}: FiltersModalProps) {
  const t = useTranslations("filtersModal");
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [minBedrooms, setMinBedrooms] = useState(initialMinBedrooms ?? "");
  const [minBeds, setMinBeds] = useState(initialMinBeds ?? "");
  const [minBathrooms, setMinBathrooms] = useState(initialMinBathrooms ?? "");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialAmenities ? initialAmenities.split(",").filter(Boolean) : []
  );
  const [dogsAllowed, setDogsAllowed] = useState(!!currentParams.dogs);
  const [accessibleOnly, setAccessibleOnly] = useState(!!currentParams.accessible);

  const activeCount =
    (minBedrooms ? 1 : 0) +
    (minBeds ? 1 : 0) +
    (minBathrooms ? 1 : 0) +
    ((isOpen ? dogsAllowed : !!currentParams.dogs) ? 1 : 0) +
    ((isOpen ? accessibleOnly : !!currentParams.accessible) ? 1 : 0) +
    selectedAmenities.length;

  const clearAll = () => {
    setMinBedrooms("");
    setMinBeds("");
    setMinBathrooms("");
    setSelectedAmenities([]);
    setDogsAllowed(false);
    setAccessibleOnly(false);
  };

  const apply = () => {
    const params = new URLSearchParams();
    if (currentParams.region) params.set("region", currentParams.region);
    if (currentParams.city) params.set("city", currentParams.city);
    if (currentParams.checkin) params.set("checkin", currentParams.checkin);
    if (currentParams.checkout) params.set("checkout", currentParams.checkout);
    if (currentParams.capacity) params.set("capacity", currentParams.capacity);
    if (minBedrooms) params.set("minBedrooms", minBedrooms);
    if (minBeds) params.set("minBeds", minBeds);
    if (minBathrooms) params.set("minBathrooms", minBathrooms);
    if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));
    // Garde le nombre de chiens choisi dans la barre de recherche (?dogs=2)
    // plutôt que de le ramener à 1 quand le filtre reste coché.
    if (dogsAllowed) params.set("dogs", currentParams.dogs || "1");
    if (accessibleOnly) params.set("accessible", "1");
    router.push(localePath(`/chalets${params.toString() ? `?${params.toString()}` : ""}`, locale));
    setIsOpen(false);
  };

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const isEn = locale === "en";
  const counterLabels = (label: string) => ({
    decreaseLabel: `${label}, ${isEn ? "decrease" : "diminuer"}`,
    increaseLabel: `${label}, ${isEn ? "increase" : "augmenter"}`,
  });

  const toggleAmenity = (a: string) =>
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  return (
    <>
      {/* ── Button ────────────────────────────────────────────────────────── */}
      <button
        onClick={() => {
          // La pastille « Chiens acceptés » au-dessus des résultats change
          // l'URL sans passer par cette fenêtre — resynchronise à l'ouverture.
          setDogsAllowed(!!currentParams.dogs);
          setAccessibleOnly(!!currentParams.accessible);
          setIsOpen(true);
        }}
        className={`relative flex items-center gap-2 lg:gap-0 xl:gap-2 px-4 lg:px-3 xl:px-4 py-3 rounded-full border text-sm font-medium transition-colors shrink-0 ${
          activeCount > 0
            ? "border-charcoal-800 bg-charcoal-800 text-white"
            : "border-[#dddddd] bg-white text-charcoal-700 hover:border-charcoal-400"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <span className="lg:hidden xl:inline">{t("button")}</span>
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Modal (portal — renders outside any stacking context) ─────── */}
      {isOpen && typeof document !== "undefined" && createPortal(
        // Téléphones : feuille qui monte du bas sur presque toute la hauteur ;
        // à partir de md : fenêtre centrée comme avant.
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-modal-title"
            className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg h-[92dvh] md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl"
          >

            {/* Header */}
            <div className="flex items-center justify-between pl-6 pr-3 md:pr-4 py-2 md:py-3 border-b border-[#ebebeb] shrink-0">
              <h2 id="filters-modal-title" className="text-heading-3 font-bold text-charcoal-800">{t("title")}</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={isEn ? "Close filters" : "Fermer les filtres"}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-charcoal-50 transition-colors"
              >
                <svg className="w-5 h-5 text-charcoal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-6">

              {/* Chambres et lits */}
              <div>
                <h3 className="text-base font-bold text-charcoal-800 mb-1">{t("bedroomsAndBeds")}</h3>
                <CounterRow label={t("bedrooms")} value={minBedrooms} onChange={setMinBedrooms} anyLabel={t("any")} {...counterLabels(t("bedrooms"))} />
                <div className="h-px bg-[#ebebeb]" />
                <CounterRow label={t("beds")} value={minBeds} onChange={setMinBeds} anyLabel={t("any")} {...counterLabels(t("beds"))} />
                <div className="h-px bg-[#ebebeb]" />
                <CounterRow label={t("bathrooms")} value={minBathrooms} onChange={setMinBathrooms} anyLabel={t("any")} {...counterLabels(t("bathrooms"))} />
              </div>

              <div className="h-px bg-[#ebebeb]" />

              {/* Chiens et accessibilité */}
              <div className="space-y-4">
                <SwitchRow label={t("dogsToggle")} sub={t("dogsToggleSub")} checked={dogsAllowed} onChange={setDogsAllowed} />
                <SwitchRow label={t("accessibleToggle")} sub={t("accessibleToggleSub")} checked={accessibleOnly} onChange={setAccessibleOnly} />
              </div>

              <div className="h-px bg-[#ebebeb]" />

              {/* Caractéristiques */}
              <div>
                <h3 className="text-base font-bold text-charcoal-800 mb-4">{t("amenities")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AMENITY_CATALOG.map((entry) => {
                    const active = selectedAmenities.includes(entry.id);
                    return (
                      <label
                        key={entry.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-[#dddddd] hover:border-charcoal-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleAmenity(entry.id)}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition-colors ${
                            active ? "bg-primary border-primary" : "border-charcoal-200"
                          }`}
                        >
                          {active && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm ${active ? "font-medium text-charcoal-800" : "text-charcoal-600"}`}>
                          {locale === "en" ? entry.labelEn : entry.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="shrink-0 border-t border-[#ebebeb] px-4 md:px-6 pt-3 md:pt-4 pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-4 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={clearAll}
                className="min-h-12 md:min-h-11 -ml-2 px-2 whitespace-nowrap text-sm font-semibold md:font-normal text-charcoal-800 md:text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2 transition-colors"
              >
                {t("clearAll")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="bg-primary text-white px-5 md:px-6 h-12 rounded-full whitespace-nowrap text-base md:text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {t("showResults")}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
