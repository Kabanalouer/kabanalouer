"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import type { ListingForMap } from "./ChaletsMapLayout";

const QUEBEC_CENTER = { lat: 46.8, lng: -72.0 };

export type MapBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Minimal Airbnb-style: no POI, desaturated roads, soft water/parks.
// Note: applies only when the Cloud Console style for mapId "kabanalouer-public"
// is set to "Standard" (default) — not overridden by a custom cloud theme.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#e8e8e4" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d8d8d4" }] },
  { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#f0eeeb" }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#e6e4e0" }] },
  { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: "#f5f4f0" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c4d9ef" }] },
  { featureType: "landscape", elementType: "geometry.fill", stylers: [{ color: "#f5f5f0" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#ddefd4" }, { visibility: "on" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c8c8c4" }, { weight: 0.8 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#888888" }] },
];

// ── Inner component (must live inside <Map> to use useMap) ──────────────────

function MapContent({
  listings,
  hoveredId,
  onHoverChange,
  onPendingBoundsChange,
}: {
  listings: ListingForMap[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  onPendingBoundsChange: (b: MapBounds) => void;
}) {
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isFirstIdle = useRef(true);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      if (isFirstIdle.current) { isFirstIdle.current = false; return; }
      const bounds = map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onPendingBoundsChange({
        minLat: sw.lat(), maxLat: ne.lat(),
        minLng: sw.lng(), maxLng: ne.lng(),
      });
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map, onPendingBoundsChange]);

  // Close popup when clicking the map background
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", () => setSelectedId(null));
    return () => window.google.maps.event.removeListener(listener);
  }, [map]);

  const withCoords = listings.filter((l) => l.lat != null && l.lng != null);
  const selected = selectedId ? withCoords.find((l) => l.id === selectedId) ?? null : null;

  return (
    <>
      {withCoords.map((listing) => {
        const isActive = listing.id === hoveredId || listing.id === selectedId;
        return (
          <AdvancedMarker
            key={listing.id}
            position={{ lat: listing.lat!, lng: listing.lng! }}
            onClick={() => setSelectedId((prev) => (prev === listing.id ? null : listing.id))}
            zIndex={isActive ? 20 : 1}
          >
            <div
              onMouseEnter={() => onHoverChange(listing.id)}
              onMouseLeave={() => onHoverChange(null)}
              className={`transition-all duration-150 cursor-pointer ${isActive ? "scale-110" : ""}`}
            >
              {listing.photos[0] ? (
                <div
                  className={`w-12 h-12 rounded-full overflow-hidden transition-all ${
                    isActive ? "border-[3px] border-primary" : "border-[3px] border-white"
                  }`}
                  style={{ boxShadow: isActive ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 8px rgba(0,0,0,0.22)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" width={48} height={48} />
                </div>
              ) : (
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center bg-white transition-all ${
                    isActive ? "border-[3px] border-primary" : "border-[3px] border-white"
                  }`}
                  style={{ boxShadow: isActive ? "0 4px 16px rgba(0,0,0,0.30)" : "0 2px 8px rgba(0,0,0,0.22)" }}
                >
                  <svg className={`w-5 h-5 ${isActive ? "text-primary" : "text-charcoal-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {selected && selected.lat != null && selected.lng != null && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelectedId(null)}
        >
          <div className="w-52 font-sans text-left">
            {selected.photos[0] && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selected.photos[0]}
                alt={selected.title}
                className="w-full h-28 object-cover rounded-lg mb-2"
                style={{ display: "block" }}
              />
            )}
            <p className="font-semibold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-2">
              {selected.title}
            </p>
            <p className="text-xs text-gray-500 mb-2">
              {selected.city ? `${selected.city}, ${selected.region}` : selected.region}
            </p>
            <p className="text-sm font-bold text-gray-900 mb-3">
              {selected.priceOnRequest
                ? "Sur demande"
                : `À partir de ${selected.price} $ / nuit`}
            </p>
            <a
              href={`/chalets/${selected.id}`}
              className="block text-center text-xs bg-primary text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Voir le chalet →
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

export default function ChaletsMap({
  listings,
  hoveredId,
  onHoverChange,
  onBoundsChange,
}: {
  listings: ListingForMap[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  onBoundsChange: (b: MapBounds) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [hasMoved, setHasMoved] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);

  const handlePendingBoundsChange = useCallback((b: MapBounds) => {
    setPendingBounds(b);
    setHasMoved(true);
  }, []);

  const handleSearchHere = () => {
    if (!pendingBounds) return;
    onBoundsChange(pendingBounds);
    setHasMoved(false);
  };

  const withCoords = listings.filter((l) => l.lat != null && l.lng != null);
  const center =
    withCoords.length > 0
      ? {
          lat: withCoords.reduce((s, l) => s + l.lat!, 0) / withCoords.length,
          lng: withCoords.reduce((s, l) => s + l.lng!, 0) / withCoords.length,
        }
      : QUEBEC_CENTER;

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carte non disponible</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={withCoords.length > 0 ? 9 : 7}
          mapId="kabanalouer-public"
          disableDefaultUI
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
          styles={MAP_STYLES}
        >
          <MapContent
            listings={listings}
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onPendingBoundsChange={handlePendingBoundsChange}
          />
        </Map>

        {hasMoved && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleSearchHere}
              className="flex items-center gap-2 bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Rechercher dans cette zone
            </button>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
