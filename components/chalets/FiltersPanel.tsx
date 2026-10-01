"use client";

// Contenu de la fenêtre « Filtres », chargé seulement à l'ouverture
// (next/dynamic dans FiltersModal) : le catalogue d'équipements et ces
// composants ne pèsent plus sur le chargement de chaque page (Navbar).

import { useState } from "react";
import { createPortal } from "react-dom";
import { AMENITY_CATALOG, AMENITY_PRIORITY_ORDER } from "@/lib/amenities-catalog";
import { useTranslations, useLocale } from "next-intl";

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

// Filtres populaires en pastilles, sous « Chambres et lits ». Les ids sont ceux
// du catalogue ; « dogs » et « accessible » sont les deux filtres spéciaux.
const POPULAR_FILTERS = [
  { id: "bord-eau", key: "popularWaterfront" },
  { id: "spa", key: "popularSpa" },
  { id: "sauna", key: "popularSauna" },
  { id: "dogs", key: "popularDogs" },
  { id: "accessible", key: "popularAccessible" },
  { id: "table-billard", key: "popularPoolTable" },
  { id: "borne-recharge-vr", key: "popularEvCharger" },
  { id: "espace-travail", key: "popularRemoteWork" },
] as const;
const POPULAR_AMENITY_IDS = new Set<string>(POPULAR_FILTERS.map((f) => f.id));

// Liste complète dans l'ordre d'importance des « Points forts » (fiche publique).
const priorityRank = (id: string) => {
  const i = AMENITY_PRIORITY_ORDER.indexOf(id);
  return i === -1 ? AMENITY_PRIORITY_ORDER.length : i;
};
const AMENITIES_BY_PRIORITY = [...AMENITY_CATALOG].sort((x, y) => priorityRank(x.id) - priorityRank(y.id));

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // Même style que les pastilles au-dessus des résultats (ChaletsMapLayout)
      className={`px-4 min-h-11 rounded-full border text-sm font-medium transition-colors ${
        active
          ? "border-charcoal-800 bg-charcoal-800 text-white"
          : "border-[#dddddd] bg-white text-charcoal-700 hover:border-charcoal-400"
      }`}
    >
      {label}
    </button>
  );
}

export type FiltersPanelProps = {
  minBedrooms: string;
  setMinBedrooms: (v: string) => void;
  minBeds: string;
  setMinBeds: (v: string) => void;
  minBathrooms: string;
  setMinBathrooms: (v: string) => void;
  dogsAllowed: boolean;
  setDogsAllowed: (v: boolean) => void;
  accessibleOnly: boolean;
  setAccessibleOnly: (v: boolean) => void;
  selectedAmenities: string[];
  toggleAmenity: (id: string) => void;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
};

export default function FiltersPanel({
  minBedrooms,
  setMinBedrooms,
  minBeds,
  setMinBeds,
  minBathrooms,
  setMinBathrooms,
  dogsAllowed,
  setDogsAllowed,
  accessibleOnly,
  setAccessibleOnly,
  selectedAmenities,
  toggleAmenity,
  onClose,
  onClear,
  onApply,
}: FiltersPanelProps) {
  const t = useTranslations("filtersModal");
  const locale = useLocale();
  const isEn = locale === "en";
  // Liste complète repliée, sauf si une caractéristique hors pastilles est déjà cochée.
  const hiddenSelectedCount = selectedAmenities.filter((id) => !POPULAR_AMENITY_IDS.has(id)).length;
  const [showAllAmenities, setShowAllAmenities] = useState(hiddenSelectedCount > 0);
  const isPopularActive = (id: string) =>
    id === "dogs" ? dogsAllowed : id === "accessible" ? accessibleOnly : selectedAmenities.includes(id);
  const togglePopular = (id: string) => {
    if (id === "dogs") setDogsAllowed(!dogsAllowed);
    else if (id === "accessible") setAccessibleOnly(!accessibleOnly);
    else toggleAmenity(id);
  };
  const counterLabels = (label: string) => ({
    decreaseLabel: `${label}, ${isEn ? "decrease" : "diminuer"}`,
    increaseLabel: `${label}, ${isEn ? "increase" : "augmenter"}`,
  });

  return createPortal(
    // Téléphones : feuille qui monte du bas sur presque toute la hauteur ;
    // à partir de md : fenêtre centrée comme avant.
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose()} />
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
            onClick={() => onClose()}
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

          {/* Filtres populaires */}
          <div>
            <h3 className="text-base font-bold text-charcoal-800 mb-4">{t("popularTitle")}</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_FILTERS.map((f) => (
                <Pill key={f.id} label={t(f.key)} active={isPopularActive(f.id)} onClick={() => togglePopular(f.id)} />
              ))}
            </div>
          </div>

          <div className="h-px bg-[#ebebeb]" />

          {/* Toutes les caractéristiques (repliable) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAllAmenities((v) => !v)}
              aria-expanded={showAllAmenities}
              aria-controls="filters-all-amenities"
              className="w-full flex items-center justify-between gap-3 min-h-11 text-left"
            >
              <span className="text-base font-bold text-charcoal-800">
                {t("allAmenities")}
                {hiddenSelectedCount > 0 && (
                  <span className="ml-2 text-sm font-medium text-charcoal-400">({hiddenSelectedCount})</span>
                )}
              </span>
              <svg
                className={`w-5 h-5 text-charcoal-600 shrink-0 transition-transform ${showAllAmenities ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showAllAmenities && (
            <div id="filters-all-amenities" className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {AMENITIES_BY_PRIORITY.map((entry) => {
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 border-t border-[#ebebeb] px-4 md:px-6 pt-3 md:pt-4 pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-4 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={onClear}
            className="min-h-12 md:min-h-11 -ml-2 px-2 whitespace-nowrap text-sm font-semibold md:font-normal text-charcoal-800 md:text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2 transition-colors"
          >
            {t("clearAll")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="bg-primary text-white px-5 md:px-6 h-12 rounded-full whitespace-nowrap text-base md:text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("showResults")}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
