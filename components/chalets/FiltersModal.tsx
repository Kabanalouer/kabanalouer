"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AMENITY_CATALOG } from "@/lib/amenities-catalog";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";

function CounterRow({ label, value, onChange, max = 8, anyLabel }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  anyLabel: string;
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
          onClick={() => onChange(num <= 1 ? "" : String(num - 1))}
          disabled={atMin}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${
            atMin
              ? "border-[#ebebeb] text-charcoal-100 cursor-not-allowed"
              : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-800 hover:text-charcoal-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span className="w-8 text-center text-sm font-medium text-charcoal-800 tabular-nums">{display}</span>
        <button
          onClick={() => onChange(atMax ? String(max) : String(num + 1))}
          disabled={atMax}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${
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

interface FiltersModalProps {
  currentParams: {
    region?: string;
    city?: string;
    checkin?: string;
    checkout?: string;
    capacity?: string;
    dogs?: string;
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

  const activeCount =
    (minBedrooms ? 1 : 0) +
    (minBeds ? 1 : 0) +
    (minBathrooms ? 1 : 0) +
    ((isOpen ? dogsAllowed : !!currentParams.dogs) ? 1 : 0) +
    selectedAmenities.length;

  const clearAll = () => {
    setMinBedrooms("");
    setMinBeds("");
    setMinBathrooms("");
    setSelectedAmenities([]);
    setDogsAllowed(false);
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
    router.push(localePath(`/chalets${params.toString() ? `?${params.toString()}` : ""}`, locale));
    setIsOpen(false);
  };

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb] shrink-0">
              <h2 className="text-heading-3 font-bold text-charcoal-800">{t("title")}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-charcoal-50 transition-colors"
              >
                <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Chambres et lits */}
              <div>
                <h3 className="text-base font-bold text-charcoal-800 mb-1">{t("bedroomsAndBeds")}</h3>
                <CounterRow label={t("bedrooms")} value={minBedrooms} onChange={setMinBedrooms} anyLabel={t("any")} />
                <div className="h-px bg-[#ebebeb]" />
                <CounterRow label={t("beds")} value={minBeds} onChange={setMinBeds} anyLabel={t("any")} />
                <div className="h-px bg-[#ebebeb]" />
                <CounterRow label={t("bathrooms")} value={minBathrooms} onChange={setMinBathrooms} anyLabel={t("any")} />
              </div>

              <div className="h-px bg-[#ebebeb]" />

              {/* Chiens */}
              <div>
                <h3 className="text-base font-bold text-charcoal-800 mb-3">{t("dogs")}</h3>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span>
                    <span className="block text-sm text-charcoal-800">{t("dogsToggle")}</span>
                    <span className="block text-xs text-charcoal-400 mt-0.5">{t("dogsToggleSub")}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={dogsAllowed}
                    onChange={(e) => setDogsAllowed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span
                    aria-hidden="true"
                    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${dogsAllowed ? "bg-primary" : "bg-charcoal-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dogsAllowed ? "translate-x-5" : ""}`} />
                  </span>
                </label>
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
            <div className="shrink-0 border-t border-[#ebebeb] px-6 py-4 flex items-center justify-between">
              <button
                onClick={clearAll}
                className="text-sm text-charcoal-400 hover:text-charcoal-800 underline underline-offset-2 transition-colors"
              >
                {t("clearAll")}
              </button>
              <button
                onClick={apply}
                className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
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
