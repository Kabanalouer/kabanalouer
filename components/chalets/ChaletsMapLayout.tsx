"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ListingCard, { type Listing } from "@/components/ListingCard";
import type { MapBounds } from "./ChaletsMap";

export interface ListingForMap extends Listing {
  lat: number | null;
  lng: number | null;
}

const ChaletsMap = dynamic(() => import("./ChaletsMap"), { ssr: false });

interface Props {
  initialListings: ListingForMap[];
  currentUserId: string | null;
  filters: {
    region?: string;
    city?: string;
    capacity?: string;
    checkin?: string;
    checkout?: string;
    minBedrooms?: string;
    minBeds?: string;
    minBathrooms?: string;
    amenities?: string;
  };
}

export default function ChaletsMapLayout({ initialListings, currentUserId, filters }: Props) {
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
        ...(filters.checkin && { checkin: filters.checkin }),
        ...(filters.checkout && { checkout: filters.checkout }),
        ...(filters.minBedrooms && { minBedrooms: filters.minBedrooms }),
        ...(filters.minBeds && { minBeds: filters.minBeds }),
        ...(filters.minBathrooms && { minBathrooms: filters.minBathrooms }),
        ...(filters.amenities && { amenities: filters.amenities }),
      });
      const res = await fetch(`/api/listings/geo?${params}`);
      if (res.ok) setListings(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const EmptyState = () => (
    <div className="col-span-2 py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <p className="font-semibold text-charcoal-800 mb-1">Aucun chalet trouvé</p>
      <p className="text-charcoal-400 text-sm">
        Essayez d&apos;autres filtres ou déplacez la carte.
      </p>
    </div>
  );

  const SkeletonCard = () => (
    <div className="animate-pulse">
      <div className="aspect-[20/19] rounded-xl bg-charcoal-100 mb-3" />
      <div className="h-4 bg-charcoal-100 rounded w-4/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-3/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-2/5" />
    </div>
  );

  const listGrid = (cols: string) => (
    <div className={`grid ${cols} gap-x-5 gap-y-8 p-5`}>
      {isLoading ? (
        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        listings.map((listing) => (
          <div
            key={listing.id}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`transition-shadow duration-150 rounded-xl ${
              hoveredId === listing.id
                ? "ring-2 ring-primary/50 ring-offset-2"
                : ""
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
      {/* ── DESKTOP: split layout ── */}
      <div className="hidden lg:flex h-full overflow-hidden">

        {/* Left: scrollable list */}
        <div className="w-1/2 overflow-y-auto border-r border-[#ebebeb]">
          <div className="px-5 pt-6 pb-2 flex items-baseline justify-between">
            <h1 className="text-lg font-bold text-charcoal-800">
              Chalets au Québec
            </h1>
            {!isLoading && (
              <span className="text-xs text-charcoal-400">
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

      {/* ── MOBILE: list ── */}
      <div className="lg:hidden">
        <div className="px-4 pt-5 pb-2 flex items-baseline justify-between">
          <h1 className="text-lg font-bold text-charcoal-800">Chalets au Québec</h1>
          {!isLoading && listings.length > 0 && (
            <span className="text-xs text-charcoal-400">
              {listings.length} résultat{listings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {listGrid("grid-cols-1 sm:grid-cols-2")}

        {/* Floating "Voir la carte" */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowMapMobile(true)}
            className="flex items-center gap-2 bg-charcoal-800 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-charcoal-900 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Voir la carte
          </button>
        </div>
      </div>

      {/* ── MOBILE: fullscreen map overlay ── */}
      {showMapMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ebebeb] shrink-0">
            <span className="font-semibold text-charcoal-800 text-sm">Carte</span>
            <button
              onClick={() => setShowMapMobile(false)}
              className="p-2 rounded-full hover:bg-charcoal-50 transition-colors"
              aria-label="Fermer la carte"
            >
              <svg className="w-5 h-5 text-charcoal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
