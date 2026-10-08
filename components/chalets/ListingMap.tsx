"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { PUBLIC_MAP_ID } from "@/lib/googleMaps";

// Circle overlay using native Maps API (no built-in Circle in @vis.gl)
function ApproximateCircle({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const circle = new window.google.maps.Circle({
      center: { lat, lng },
      radius: 500,
      map,
      fillColor: "#0F6E56",
      fillOpacity: 0.15,
      strokeColor: "#0F6E56",
      strokeOpacity: 0.35,
      strokeWeight: 2,
    });
    return () => circle.setMap(null);
  }, [map, lat, lng]);

  return null;
}

function MapInner({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Map
      defaultCenter={{ lat, lng }}
      defaultZoom={13}
      gestureHandling="none"
      disableDefaultUI
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
