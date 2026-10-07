"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { PUBLIC_MAP_ID } from "@/lib/googleMaps";
import type { ListingForMap } from "./ChaletsMapLayout";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { getRegionByDbValue } from "@/lib/regions";
import { formatPrice } from "@/lib/formatPrice";
import { REGION_BOUNDS, SOUTHERN_QUEBEC_BOUNDS, type GeoBounds } from "@/lib/regionBounds";

const QUEBEC_CENTER = { lat: 46.8, lng: -72.0 };

export type MapBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Recherche : ville et/ou région choisies, pour cadrer la carte.
export type MapDestination = { city?: string; region?: string };

// Jamais plus près que ce zoom au cadrage initial : même avec un seul chalet,
// on voit le village et ses environs, pas la rue.
const MAX_FIT_ZOOM = 12;

// ── Scale bar ─────────────────────────────────────────────────────────────────

function ScaleBar({ zoom, lat }: { zoom: number; lat: number }) {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const targetMeters = metersPerPx * 80;
  const nice = steps.find((s) => s >= targetMeters) ?? 100000;
  const barWidth = Math.round(nice / metersPerPx);
  const label = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`;

  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
      <div
        className="flex flex-col items-end gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: "rgba(0,0,0,0.60)" }}
      >
        <span className="text-sm font-semibold text-white leading-none tracking-wide">
          {label}
        </span>
        <div className="h-[3px] bg-white rounded-full w-full" />
      </div>
    </div>
  );
}

// ── Inner component (must live inside <Map> to use useMap) ────────────────────

function MapContent({
  listings,
  hoveredId,
  onHoverChange,
  onPendingBoundsChange,
  onMapReady,
  onMapStateChange,
  destination,
}: {
  listings: ListingForMap[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  onPendingBoundsChange: (b: MapBounds) => void;
  onMapReady: (m: google.maps.Map) => void;
  onMapStateChange: (s: { zoom: number; lat: number }) => void;
  destination: MapDestination;
}) {
  const tMap = useTranslations("chaletsMap");
  const locale = useLocale();
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isFirstIdle = useRef(true);
  // Déplacement fait par le code (cadrage initial) : ne doit pas afficher
  // « Rechercher dans cette zone ».
  const programmaticMove = useRef(false);
  const hasFitted = useRef(false);
  const geocodingLib = useMapsLibrary("geocoding");

  useEffect(() => {
    if (map) onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      onMapStateChange({ zoom: map.getZoom() ?? 9, lat: map.getCenter()?.lat() ?? 46.8 });
      if (isFirstIdle.current) { isFirstIdle.current = false; return; }
      if (programmaticMove.current) { programmaticMove.current = false; return; }
      const bounds = map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onPendingBoundsChange({ minLat: sw.lat(), maxLat: ne.lat(), minLng: sw.lng(), maxLng: ne.lng() });
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map, onPendingBoundsChange, onMapStateChange]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", () => setSelectedId(null));
    return () => window.google.maps.event.removeListener(listener);
  }, [map]);

  // Cadrage initial, une seule fois par recherche : les chalets trouvés s'il y
  // en a ; sinon la ville (géocodage Google), la région, ou le sud du Québec.
  useEffect(() => {
    if (!map || hasFitted.current) return;
    const points = listings.filter((l) => l.lat != null && l.lng != null);
    const fit = (b: google.maps.LatLngBounds | GeoBounds) => {
      programmaticMove.current = true;
      map.fitBounds(b, 48);
      window.google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) {
          programmaticMove.current = true;
          map.setZoom(MAX_FIT_ZOOM);
        }
      });
    };
    const regionFallback = () => fit((destination.region && REGION_BOUNDS[destination.region]) || SOUTHERN_QUEBEC_BOUNDS);

    if (points.length > 0) {
      hasFitted.current = true;
      if (points.length === 1) {
        programmaticMove.current = true;
        map.setCenter({ lat: points[0].lat!, lng: points[0].lng! });
        map.setZoom(MAX_FIT_ZOOM);
        return;
      }
      const b = new window.google.maps.LatLngBounds();
      points.forEach((p) => b.extend({ lat: p.lat!, lng: p.lng! }));
      fit(b);
      return;
    }
    if (destination.city) {
      if (!geocodingLib) return; // attend le chargement de la bibliothèque
      hasFitted.current = true;
      new geocodingLib.Geocoder()
        .geocode({ address: `${destination.city}, Québec, Canada`, componentRestrictions: { country: "CA" } })
        .then(({ results }) => {
          const vp = results[0]?.geometry?.viewport;
          if (vp) fit(vp);
          else regionFallback();
        })
        .catch(() => regionFallback());
      return;
    }
    hasFitted.current = true;
    regionFallback();
  }, [map, listings, destination.city, destination.region, geocodingLib]);

  const withCoords = listings.filter((l) => l.lat != null && l.lng != null);
  const selected = selectedId ? withCoords.find((l) => l.id === selectedId) ?? null : null;
  const selectedRegion = selected
    ? (locale === "en" ? getRegionByDbValue(selected.region)?.nameEn ?? selected.region : selected.region)
    : "";

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
            {/* Pastille de prix : prix par nuit, ou « Sur demande » */}
            <div
              onMouseEnter={() => onHoverChange(listing.id)}
              onMouseLeave={() => onHoverChange(null)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] leading-4 font-bold transition-[background-color,color,transform] duration-[140ms] ease-out ${
                isActive ? "bg-[#222] text-white scale-[1.06]" : "bg-white text-[#222]"
              }`}
              style={{ boxShadow: "0 2px 8px rgba(35,30,22,.22)" }}
            >
              {listing.priceOnRequest || !(listing.price > 0) ? tMap("priceOnRequest") : formatPrice(listing.price, locale)}
            </div>
          </AdvancedMarker>
        );
      })}

      {selected && selected.lat != null && selected.lng != null && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          pixelOffset={[0, -32]} // au-dessus de la pastille
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
            <p className="font-semibold text-charcoal-900 text-sm leading-snug mb-0.5 line-clamp-2">{selected.title}</p>
            <p className="text-xs text-charcoal-500 mb-2">
              {selected.city ? `${selected.city}, ${selectedRegion}` : selectedRegion}
            </p>
            <p className="text-sm font-bold text-charcoal-900 mb-3">
              {selected.priceOnRequest ? tMap("priceOnRequest") : tMap("priceFrom", { price: selected.price })}
            </p>
            <a
              href={
                buildListingPath(
                  { region: selected.region, city: selected.city ?? null, listing_number: selected.listing_number ?? null, custom_slug: selected.custom_slug ?? null },
                  locale === "en" ? "en" : "fr"
                ) ?? localePath(`/chalets/${selected.id}`, locale)
              }
              className="block text-center text-xs bg-primary text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {tMap("viewCabin")}
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Button style ──────────────────────────────────────────────────────────────

const btnCls = "w-9 h-9 bg-white rounded-lg border border-[#e0e0e0] shadow-sm flex items-center justify-center hover:bg-charcoal-50 transition-colors";

// ── Public component ──────────────────────────────────────────────────────────

export default function ChaletsMap({
  listings,
  hoveredId,
  onHoverChange,
  onBoundsChange,
  isExpanded,
  onToggleExpand,
  destination = {},
}: {
  listings: ListingForMap[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  onBoundsChange: (b: MapBounds) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  destination?: MapDestination;
}) {
  const tMap = useTranslations("chaletsMap");
  const isEn = useLocale() === "en";
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [hasMoved, setHasMoved] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [mapState, setMapState] = useState({ zoom: 9, lat: 46.8 });
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapReady = useCallback((m: google.maps.Map) => { mapRef.current = m; }, []);
  const handleMapStateChange = useCallback((s: { zoom: number; lat: number }) => setMapState(s), []);
  const handlePendingBoundsChange = useCallback((b: MapBounds) => { setPendingBounds(b); setHasMoved(true); }, []);

  const handleSearchHere = () => {
    if (!pendingBounds) return;
    onBoundsChange(pendingBounds);
    setHasMoved(false);
  };

  const zoomIn = () => { const m = mapRef.current; if (m) m.setZoom((m.getZoom() ?? 9) + 1); };
  const zoomOut = () => { const m = mapRef.current; if (m) m.setZoom((m.getZoom() ?? 9) - 1); };

  const withCoords = listings.filter((l) => l.lat != null && l.lng != null);
  const center = withCoords.length > 0
    ? { lat: withCoords.reduce((s, l) => s + l.lat!, 0) / withCoords.length, lng: withCoords.reduce((s, l) => s + l.lng!, 0) / withCoords.length }
    : QUEBEC_CENTER;

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-charcoal-50">
        <p className="text-charcoal-400 text-sm">{isEn ? "Map unavailable" : "Carte non disponible"}</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={withCoords.length > 0 ? 9 : 7}
          mapId={PUBLIC_MAP_ID}
          clickableIcons={false}
          disableDefaultUI
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        >
          <MapContent
            listings={listings}
            hoveredId={hoveredId}
            onHoverChange={onHoverChange}
            onPendingBoundsChange={handlePendingBoundsChange}
            onMapReady={handleMapReady}
            onMapStateChange={handleMapStateChange}
            destination={destination}
          />
        </Map>

        {/* "Rechercher dans cette zone" */}
        {hasMoved && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleSearchHere}
              className="flex items-center gap-2 bg-white text-charcoal-800 text-sm font-semibold px-4 py-2 rounded-full shadow-lg border border-[#e0e0e0] hover:bg-charcoal-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isEn ? "Search this area" : "Rechercher dans cette zone"}
            </button>
          </div>
        )}

        {/* Controls: ↗/✕ · + · − stacked at top-right */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            onClick={onToggleExpand}
            className={btnCls}
            aria-label={isExpanded ? tMap("collapseMap") : tMap("expandMap")}
          >
            {isExpanded ? (
              <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
          <button onClick={zoomIn} className={btnCls} aria-label={tMap("zoomIn")}>
            <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={zoomOut} className={btnCls} aria-label={tMap("zoomOut")}>
            <svg className="w-4 h-4 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        </div>

        {/* Scale bar — bottom right, above attribution */}
        <ScaleBar zoom={mapState.zoom} lat={mapState.lat} />
      </div>
    </APIProvider>
  );
}
