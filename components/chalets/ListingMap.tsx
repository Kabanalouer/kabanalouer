"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

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
      mapId="kabanalouer-public"
      style={{ width: "100%", height: "100%" }}
    >
      <ApproximateCircle lat={lat} lng={lng} />
    </Map>
  );
}

export default function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-64 rounded-2xl overflow-hidden border border-gray-100">
        <MapInner lat={lat} lng={lng} />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        La position exacte est communiquée après confirmation de la réservation.
      </p>
    </APIProvider>
  );
}
