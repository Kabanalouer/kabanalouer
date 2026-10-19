"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { PUBLIC_MAP_ID } from "@/lib/googleMaps";

// Rayon de base (position approximative) et taille minimale à l'écran : en dézoomant, le
// cercle grossit pour rester repérable (au moins MIN_SCREEN_RADIUS_PX pixels de rayon).
const BASE_RADIUS_M = 500;
const MIN_SCREEN_RADIUS_PX = 26;

function radiusFor(zoom: number, lat: number): number {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return Math.max(BASE_RADIUS_M, MIN_SCREEN_RADIUS_PX * metersPerPixel);
}

// Circle overlay using native Maps API (no built-in Circle in @vis.gl)
function ApproximateCircle({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const circle = new window.google.maps.Circle({
      center: { lat, lng },
      radius: radiusFor(map.getZoom() ?? 13, lat),
      map,
      fillColor: "#0F6E56",
      fillOpacity: 0.15,
      strokeColor: "#0F6E56",
      strokeOpacity: 0.35,
      strokeWeight: 2,
    });
    const listener = map.addListener("zoom_changed", () => circle.setRadius(radiusFor(map.getZoom() ?? 13, lat)));
    return () => {
      listener.remove();
      circle.setMap(null);
    };
  }, [map, lat, lng]);

  return null;
}

function MapInner({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Map
      defaultCenter={{ lat, lng }}
      defaultZoom={13}
      // Zoom possible (demande de Simon, 2026-10-19) : « cooperative » = ctrl + molette sur ordinateur,
      // deux doigts sur mobile, pour ne pas bloquer le défilement de la page ; boutons +/− visibles.
      // maxZoom : la carte reste une position approximative (le cercle de 500 m), jamais la rue ;
      // minZoom 6 : on peut dézoomer assez pour situer le chalet dans la province.
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
      maxZoom={15}
      minZoom={6}
      mapId={PUBLIC_MAP_ID}
      clickableIcons={false}
      style={{ width: "100%", height: "100%" }}
    >
      <ApproximateCircle lat={lat} lng={lng} />
    </Map>
  );
}

export default function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  // La carte est loin sous la ligne de flottaison : on ne monte APIProvider
  // (qui injecte le script Google Maps JS, ~480 KiB) qu'à l'approche du
  // viewport. Avant ça, le conteneur h-64 reste vide (même taille → CLS 0).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  if (!apiKey) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="h-64 rounded-2xl overflow-hidden border border-charcoal-100 bg-charcoal-50"
      >
        {visible && (
          <APIProvider apiKey={apiKey} language={locale === "en" ? "en" : "fr"} region="CA">
            <MapInner lat={lat} lng={lng} />
          </APIProvider>
        )}
      </div>
      <p className="text-sm text-charcoal-400 mt-2">
        {t("exactLocationNote")}
      </p>
    </>
  );
}
