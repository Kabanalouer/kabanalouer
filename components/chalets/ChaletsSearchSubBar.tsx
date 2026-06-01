"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import FiltersModal from "./FiltersModal";

const MONTHS_SHORT = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];

function formatShort(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

interface Props {
  region?: string;
  city?: string;
  checkin?: string;
  checkout?: string;
  capacity?: string;
  minBedrooms?: string;
  minBeds?: string;
  minBathrooms?: string;
  amenities?: string;
}

function Inner(props: Props) {
  const { region, city, checkin, checkout, capacity, minBedrooms, minBeds, minBathrooms, amenities } = props;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Ferme l'overlay après navigation
  useEffect(() => { setOpen(false); }, [pathname, searchParams]);

  const dest = city || region || "";
  const datesLabel = checkin
    ? `${formatShort(checkin)}${checkout ? ` – ${formatShort(checkout)}` : ""}`
    : "";
  const guestsLabel = capacity ? `${capacity} voy.` : "";
  const parts = [dest, datesLabel, guestsLabel].filter(Boolean);
  const summary = parts.length > 0 ? parts.join(" · ") : "Rechercher un chalet";
  const hasSearch = parts.length > 0;

  return (
    <>
      {/* Barre compacte sticky sous la navbar — mobile uniquement */}
      <div className="md:hidden sticky top-20 z-40 bg-white border-b border-[#ebebeb] px-4 py-2.5 flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex items-center gap-2.5 bg-charcoal-50 hover:bg-charcoal-100 transition-colors rounded-full px-4 py-2 text-left min-w-0"
        >
          <svg className="w-4 h-4 text-charcoal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className={`text-sm truncate ${hasSearch ? "text-charcoal-800 font-medium" : "text-charcoal-400"}`}>
            {summary}
          </span>
        </button>

        <FiltersModal
          currentParams={{
            region: region || undefined,
            city: city || undefined,
            checkin: checkin || undefined,
            checkout: checkout || undefined,
            capacity: capacity || undefined,
          }}
          initialMinBedrooms={minBedrooms}
          initialMinBeds={minBeds}
          initialMinBathrooms={minBathrooms}
          initialAmenities={amenities}
        />
      </div>

      {/* Overlay plein écran de recherche */}
      {open && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col md:hidden">
          <div className="flex items-center px-4 py-3 border-b border-[#ebebeb] shrink-0">
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-charcoal-700 font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-8 pb-6 flex flex-col items-center">
            <SearchBar
              initialRegion={region || undefined}
              initialCity={city || undefined}
              initialCheckin={checkin}
              initialCheckout={checkout}
              initialAdults={capacity ? parseInt(capacity) : undefined}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function ChaletsSearchSubBar(props: Props) {
  return (
    <Suspense fallback={
      <div className="md:hidden sticky top-20 z-40 bg-white border-b border-[#ebebeb] h-[52px]" />
    }>
      <Inner {...props} />
    </Suspense>
  );
}
