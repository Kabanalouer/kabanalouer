"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ListingCard, { type Listing } from "@/components/ListingCard";
import type { MapBounds } from "./ChaletsMap";

export interface ListingForMap extends Listing {
  lat: number | null;
  lng: number | null;
}

// Load the map client-side only (window.google is not available during SSR)
const ChaletsMap = dynamic(() => import("./ChaletsMap"), { ssr: false });

interface Props {
  initialListings: ListingForMap[];
  currentUserId: string | null;
  filters: {
    region?: string;
    city?: string;
    capacity?: string;
    amenity?: string;
    checkin?: string;
    checkout?: string;
  };
  activeFilters?: string;
}

export default function ChaletsMapLayout({ initialListings, currentUserId, filters, activeFilters }: Props) {
  const [listings, setListings] = useState<ListingForMap[]>(initialListings);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBoundsChange = useCallback(async (bounds: MapBounds) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLng: bounds.minLng.toString(),
        maxLng: bounds.maxLng.toString(),
        ...(filters.region && { region: filters.region }),
        ...(filters.city && { city: filters.city }),
        ...(filters.capacity && { capacity: filters.capacity }),
        ...(filters.amenity && { amenity: filters.amenity }),
        ...(filters.checkin && { checkin: filters.checkin }),
        ...(filters.checkout && { checkout: filters.checkout }),
      });
      const res = await fetch(`/api/listings/geo?${params}`);
      if (res.ok) setListings(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const listGrid = (cols: string) => (
    <div className={`grid ${cols} gap-4 p-5`}>
      {isLoading ? (
        [...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl aspect-[4/3] animate-pulse" />
        ))
      ) : listings.length === 0 ? (
        <div className="col-span-2 py-20 text-center">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="font-semibold text-gray-900 mb-1">Aucun chalet trouvé</p>
          <p className="text-gray-500 text-sm">
            Essayez d&apos;autres filtres ou déplacez la carte.
          </p>
        </div>
      ) : (
        listings.map((listing) => (
          <div
            key={listing.id}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`transition-all duration-150 rounded-2xl ${
              hoveredId === listing.id ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
          >
            <ListingCard listing={listing} currentUserId={currentUserId} />
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: split layout ───────────────────────────────────────────── */}
      <div className="hidden lg:flex h-full overflow-hidden">

        {/* Left: scrollable list */}
        <div className="w-1/2 overflow-y-auto border-r border-gray-100">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Chalets au Québec</h1>
              {activeFilters && (
                <p className="text-xs text-gray-500 mt-0.5">{activeFilters}</p>
              )}
            </div>
            {!isLoading && (
              <span className="text-xs text-gray-400">
                {listings.length} résultat{listings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {listGrid("grid-cols-2")}
        </div>

        {/* Right: sticky map */}
        <div className="w-1/2 h-full">
          <ChaletsMap
            listings={listings}
            hoveredId={hoveredId}
            onHoverChange={setHoveredId}
            onBoundsChange={handleBoundsChange}
          />
        </div>
      </div>

      {/* ── MOBILE: list only ───────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="px-4 pt-5 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Chalets au Québec</h1>
          {activeFilters && <p className="text-xs text-gray-500">{activeFilters}</p>}
        </div>
        {listGrid("grid-cols-1 sm:grid-cols-2")}

        {/* "Voir la carte" floating button */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowMapMobile(true)}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Voir la carte
          </button>
        </div>
      </div>

      {/* ── MOBILE: fullscreen map overlay ──────────────────────────────────── */}
      {showMapMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="font-semibold text-gray-900 text-sm">Carte</span>
            <button
              onClick={() => setShowMapMobile(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Fermer la carte"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <ChaletsMap
              listings={listings}
              hoveredId={hoveredId}
              onHoverChange={setHoveredId}
              onBoundsChange={handleBoundsChange}
            />
          </div>
        </div>
      )}
    </>
  );
}
