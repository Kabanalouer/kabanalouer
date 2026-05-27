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
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      <p className="text-charcoal-400 text-sm">Essayez d&apos;autres filtres ou déplacez la carte.</p>
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
    <div className={`grid ${cols} gap-x-5 gap-y-8`}>
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
              hoveredId === listing.id ? "ring-2 ring-primary/50 ring-offset-2" : ""
            }`}
          >
            <ListingCard listing={listing} currentUserId={currentUserId} />
          </div>
        ))
      )}
    </div>
  );

  const mapFrame = (height: string, expanded = false) => (
    <div
      className="rounded-2xl overflow-hidden border border-[#e8e8e8] w-full"
      style={{ height, boxShadow: "0 2px 16px rgba(0,0,0,0.10)" }}
    >
      <ChaletsMap
        listings={listings}
        hoveredId={hoveredId}
        onHoverChange={setHoveredId}
        onBoundsChange={handleBoundsChange}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((v) => !v)}
      />
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: split layout ── */}
      <div className="hidden lg:flex gap-5 items-start">

        {/* Left: 55% — hidden when expanded */}
        <div className={`flex-[55] min-w-0 px-5 pt-5 pb-10 ${isExpanded ? "hidden" : ""}`}>
          <div className="flex items-baseline justify-between mb-5">
            <h1 className="text-lg font-bold text-charcoal-800">Chalets au Québec</h1>
            {!isLoading && (
              <span className="text-xs text-charcoal-400">
                {listings.length} résultat{listings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {listGrid("grid-cols-2")}
        </div>

        {/* Right: 45% normal / full width when expanded, with floating padding */}
        <div
          className={`${isExpanded ? "flex-1 p-4" : "flex-[45] pt-4 pr-4 pb-4"} shrink-0 sticky top-[80px] self-start`}
          style={{ height: "calc(100vh - 80px)" }}
        >
          {mapFrame("100%", isExpanded)}
        </div>
      </div>

      {/* ── MOBILE: listings then map ── */}
      <div className="lg:hidden px-4 pt-5 pb-6">
        <div className="flex items-baseline justify-between mb-5">
          <h1 className="text-lg font-bold text-charcoal-800">Chalets au Québec</h1>
          {!isLoading && listings.length > 0 && (
            <span className="text-xs text-charcoal-400">
              {listings.length} résultat{listings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {listGrid("grid-cols-1 sm:grid-cols-2")}

        {/* Map below listings on mobile */}
        <div className="mt-8">
          {mapFrame("420px")}
        </div>
      </div>
    </>
  );
}
