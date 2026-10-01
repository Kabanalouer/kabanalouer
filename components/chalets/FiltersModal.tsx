"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

// Chargée au premier clic (ou survol) du bouton — voir FiltersPanel.tsx.
const loadPanel = () => import("./FiltersPanel");
const FiltersPanel = dynamic(loadPanel, { ssr: false });

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

  const toggleAmenity = (a: string) =>
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  return (
    <>
      {/* ── Button ────────────────────────────────────────────────────────── */}
      <button
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={() => {
          // La pastille « Chiens acceptés » au-dessus des résultats change
          // l'URL sans passer par cette fenêtre — resynchronise à l'ouverture.
          setDogsAllowed(!!currentParams.dogs);
          setAccessibleOnly(!!currentParams.accessible);
          setIsOpen(true);
        }}
        className="relative flex items-center gap-2 lg:gap-0 xl:gap-2 px-4 lg:px-3 xl:px-4 py-3 rounded-full border border-[#dddddd] bg-white text-charcoal-700 hover:border-charcoal-400 text-sm font-medium transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <span className="lg:hidden xl:inline">{t("button")}</span>
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Modal (portal — renders outside any stacking context) ─────── */}
      {isOpen && (
        <FiltersPanel
          minBedrooms={minBedrooms}
          setMinBedrooms={setMinBedrooms}
          minBeds={minBeds}
          setMinBeds={setMinBeds}
          minBathrooms={minBathrooms}
          setMinBathrooms={setMinBathrooms}
          dogsAllowed={dogsAllowed}
          setDogsAllowed={setDogsAllowed}
          accessibleOnly={accessibleOnly}
          setAccessibleOnly={setAccessibleOnly}
          selectedAmenities={selectedAmenities}
          toggleAmenity={toggleAmenity}
          onClose={() => setIsOpen(false)}
          onClear={clearAll}
          onApply={apply}
        />
      )}
    </>
  );
}
