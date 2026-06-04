"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ListingCard, { type Listing } from "@/components/ListingCard";
import type { MapBounds } from "./ChaletsMap";
import ChaletsSearchSubBar from "./ChaletsSearchSubBar";

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
  const destination = filters.city || filters.region || null;
  const pageTitle = destination ? `Chalets · ${destination}` : "Chalets au Québec";
  const [listings, setListings] = useState<ListingForMap[]>(initialListings);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);

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
            className="rounded-xl"
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
      {/* Barre de recherche compacte mobile — sticky sous la navbar */}
      <ChaletsSearchSubBar
        region={filters.region}
        city={filters.city}
        checkin={filters.checkin}
        checkout={filters.checkout}
        capacity={filters.capacity}
        minBedrooms={filters.minBedrooms}
        minBeds={filters.minBeds}
        minBathrooms={filters.minBathrooms}
        amenities={filters.amenities}
      />

      {/* ── DESKTOP: split layout ── */}
      <div className="hidden lg:flex gap-5 items-start">

        {/* Left: 55% — hidden when expanded */}
        <div className={`flex-[55] min-w-0 px-5 pt-5 pb-10 ${isExpanded ? "hidden" : ""}`}>
          <div className="mb-5">
            <h1 className="text-lg font-bold text-charcoal-800">{pageTitle}</h1>
            {!isLoading && (
              <span className="text-xs text-charcoal-400 mt-0.5 block">
                {listings.length} résultat{listings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {listGrid("grid-cols-2")}
        </div>

        {/* Right: 45% normal / full width when expanded, with floating padding */}
        <div
          className={`${isExpanded ? "flex-1 p-[50px]" : "flex-[45] pt-[50px] pr-[50px] pb-[50px]"} shrink-0 sticky top-[80px] self-start`}
          style={{ height: "calc(100vh - 80px)" }}
        >
          {mapFrame("100%", isExpanded)}
        </div>
      </div>

      {/* ── MOBILE: liste + bouton flottant + carte plein écran ── */}
      <div className="lg:hidden">
        <div className="px-4 pt-5 pb-28">
          <div className="mb-5">
            <h1 className="text-lg font-bold text-charcoal-800">{pageTitle}</h1>
            {!isLoading && listings.length > 0 && (
              <span className="text-xs text-charcoal-400 mt-0.5 block">
                {listings.length} résultat{listings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {listGrid("grid-cols-1 sm:grid-cols-2")}
        </div>

        {/* Bouton flottant "Voir la carte" */}
        {!showMobileMap && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setShowMobileMap(true)}
              className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-3 rounded-full"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
              </svg>
              Voir la carte
            </button>
          </div>
        )}

        {/* Carte plein écran */}
        {showMobileMap && (
          <div className="fixed inset-0 z-50" style={{ height: "100dvh" }}>
            <ChaletsMap
              listings={listings}
              hoveredId={hoveredId}
              onHoverChange={setHoveredId}
              onBoundsChange={handleBoundsChange}
              isExpanded={false}
              onToggleExpand={() => {}}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <button
                onClick={() => setShowMobileMap(false)}
                className="flex items-center gap-2 bg-white text-charcoal-800 font-semibold text-sm px-5 py-3 rounded-full border border-[#ebebeb]"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.16)" }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
                Voir la liste
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
