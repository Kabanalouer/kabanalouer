"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import FiltersModal from "./FiltersModal";
import { localePath } from "@/lib/localePath";

export interface SearchFiltersState {
  region?: string;
  city?: string;
  capacity?: string;
  checkin?: string;
  checkout?: string;
  minBedrooms?: string;
  minBeds?: string;
  minBathrooms?: string;
  amenities?: string;
  theme?: string;
  dogs?: string;
  accessible?: string;
}

const KEYS: (keyof SearchFiltersState)[] = [
  "region", "city", "capacity", "checkin", "checkout",
  "minBedrooms", "minBeds", "minBathrooms", "amenities", "theme", "dogs", "accessible",
];

// Pastilles d'équipement : les identifiants sont ceux du panneau Filtres (paramètre ?amenities=a,b).
const AMENITY_PILLS = [
  { id: "spa", key: "quickSpa" },
  { id: "bord-eau", key: "quickWaterfront" },
  { id: "dogs", key: "dogsFilter" },
  { id: "sauna", key: "quickSauna" },
  { id: "espace-travail", key: "quickRemote" },
] as const;

const PILL =
  "flex-none whitespace-nowrap rounded-[var(--radius-pill)] px-4 py-[9px] min-h-11 sm:min-h-10 inline-flex items-center text-sm font-semibold transition-colors";
const PILL_IDLE = "border border-[var(--border-2)] bg-white text-[var(--fg-1)] hover:border-charcoal-400";
const PILL_ACTIVE = "border border-[var(--fg-1)] bg-[var(--fg-1)] text-white";

export default function QuickFilters({ filters }: { filters: SearchFiltersState }) {
  const t = useTranslations("chaletsMap");
  const locale = useLocale();
  const router = useRouter();

  const amenityIds = (filters.amenities ?? "").split(",").filter(Boolean);

  // Garde tous les filtres actuels (dates, région, chambres…), applique le changement, repart de la page 1.
  const go = (change: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams();
    for (const k of KEYS) {
      const v = filters[k];
      if (v) p.set(k, v);
    }
    change(p);
    const qs = p.toString();
    router.push(localePath(`/chalets${qs ? `?${qs}` : ""}`, locale));
  };

  const toggle = (id: string) => {
    if (id === "dogs") {
      go((p) => (filters.dogs ? p.delete("dogs") : p.set("dogs", "1")));
      return;
    }
    const next = amenityIds.includes(id) ? amenityIds.filter((a) => a !== id) : [...amenityIds, id];
    go((p) => (next.length > 0 ? p.set("amenities", next.join(",")) : p.delete("amenities")));
  };

  const isActive = (id: string) => (id === "dogs" ? !!filters.dogs : amenityIds.includes(id));

  return (
    <div
      className="-mx-4 lg:mx-0 px-4 lg:px-0 flex flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label={t("quickFiltersLabel")}
    >
      {/* Ordinateur : le bouton Filtres ouvre le panneau actuel. Sous 1024 px, il est dans la barre de recherche compacte. */}
      <div className="hidden lg:block flex-none">
        <FiltersModal
          variant="pill"
          currentParams={{
            region: filters.region,
            city: filters.city,
            checkin: filters.checkin,
            checkout: filters.checkout,
            capacity: filters.capacity,
            dogs: filters.dogs,
            accessible: filters.accessible,
          }}
          initialMinBedrooms={filters.minBedrooms}
          initialMinBeds={filters.minBeds}
          initialMinBathrooms={filters.minBathrooms}
          initialAmenities={filters.amenities}
        />
      </div>

      {AMENITY_PILLS.map(({ id, key }) => {
        const active = isActive(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(id)}
            className={`${PILL} ${active ? PILL_ACTIVE : PILL_IDLE}`}
          >
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
