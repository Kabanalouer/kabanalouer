"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
  useMap,
} from "@vis.gl/react-google-maps";
import { createClient } from "@/lib/supabase/client";

const REGIONS = [
  "Charlevoix",
  "Estrie (Cantons-de-l'Est)",
  "Gaspésie",
  "Lanaudière",
  "Laurentides",
  "Mauricie",
  "Outaouais",
  "Québec (ville et région)",
  "Saguenay–Lac-Saint-Jean",
  "Abitibi-Témiscamingue",
  "Côte-Nord",
  "Centre-du-Québec",
];

function matchRegion(googleRegion: string): string {
  if (!googleRegion) return "";
  const norm = googleRegion.toLowerCase().trim();
  return (
    REGIONS.find((r) => r.toLowerCase() === norm) ??
    REGIONS.find(
      (r) =>
        norm.includes(r.toLowerCase().split(" (")[0].toLowerCase()) ||
        r.toLowerCase().includes(norm)
    ) ??
    ""
  );
}

interface LocationData {
  address: string;
  city: string;
  region: string;
  lat: number | null;
  lng: number | null;
}

// ── Inner component (must be inside APIProvider) ──────────────────────────────

function LocationForm({
  listingId,
  userId,
  initial,
  onRegionChange,
  onSaved,
}: {
  listingId: string;
  userId: string;
  initial: LocationData;
  onRegionChange: (region: string) => void;
  onSaved?: (hasPosition: boolean) => void;
}) {
  const supabase = createClient();
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [region, setRegion] = useState(initial.region);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initial.lat && initial.lng ? { lat: initial.lat, lng: initial.lng } : null
  );

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Attach Places Autocomplete to input
  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" },
      fields: ["address_components", "geometry", "formatted_address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const comps = place.address_components ?? [];
      const get = (type: string) =>
        comps.find((c) => c.types.includes(type))?.long_name ?? "";

      const detectedCity =
        get("locality") || get("sublocality") || get("postal_town") || get("administrative_area_level_3");
      const detectedRegion = matchRegion(get("administrative_area_level_2"));
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setAddress(place.formatted_address ?? "");
      setCity(detectedCity);
      if (detectedRegion) {
        setRegion(detectedRegion);
        onRegionChange(detectedRegion);
      }
      setPosition({ lat, lng });
    });

    return () => {
      window.google?.maps.event.removeListener(listener);
    };
  }, [placesLib]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("listings")
      .update({
        address,
        city: city || null,
        region,
        latitude: position?.lat ?? null,
        longitude: position?.lng ?? null,
      })
      .eq("id", listingId)
      .eq("host_id", userId);
    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement. Réessayez.");
    } else {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      onSaved?.(!!(position));
    }
  };

  const inputCls =
    "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

  return (
    <div className="space-y-5">
      {/* Address autocomplete */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Adresse (non affichée publiquement) <span className="text-[#636e40] font-medium">*</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          defaultValue={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputCls}
          placeholder="Commencez à taper l'adresse du chalet…"
        />
        <p className="text-xs text-gray-400 mt-1">
          Sélectionnez une suggestion pour remplir automatiquement les champs ci-dessous.
        </p>
      </div>

      {/* City + Region auto-filled */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
            placeholder="Détectée automatiquement"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Région <span className="text-[#636e40] font-medium">*</span></label>
          <input
            type="text"
            value={region}
            readOnly
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-default focus:outline-none"
            placeholder="Détectée automatiquement"
          />
          <p className="text-xs text-gray-400 mt-1">
            La région est détectée automatiquement selon votre adresse.
          </p>
        </div>
      </div>

      {/* Map */}
      {position ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position sur la carte
            <span className="text-xs font-normal text-gray-400 ml-2">
              Déplacez le marqueur pour ajuster
            </span>
          </label>
          <div className="h-64 rounded-2xl overflow-hidden border border-gray-200">
            <MapView
              position={position}
              onDragEnd={handleDragEnd}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Lat {position.lat.toFixed(5)}, Lng {position.lng.toFixed(5)}
          </p>
        </div>
      ) : (
        <div className="h-48 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-400 text-center">
            Sélectionnez une adresse pour afficher la carte
          </p>
        </div>
      )}

      {/* Save */}
      <p className="mt-6 text-xs text-charcoal-400">* Champs requis pour publier</p>
      <div className="pt-2 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : justSaved ? "Enregistré ✓" : "Enregistrer"}
        </button>
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
      </div>
    </div>
  );
}

// ── Map + draggable marker ────────────────────────────────────────────────────

function MapView({
  position,
  onDragEnd,
}: {
  position: { lat: number; lng: number };
  onDragEnd: (e: google.maps.MapMouseEvent) => void;
}) {
  return (
    <Map
      defaultCenter={position}
      center={position}
      defaultZoom={14}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      mapId="kabanalouer-edit"
    >
      <AdvancedMarker
        position={position}
        draggable
        onDragEnd={onDragEnd}
        title="Déplacez pour ajuster la position"
      />
    </Map>
  );
}

// ── Public export (wraps with APIProvider) ────────────────────────────────────

export default function LocationSection({
  listingId,
  userId,
  initialAddress,
  initialCity,
  initialRegion,
  initialLat,
  initialLng,
  onRegionChange,
  onSaved,
}: {
  listingId: string;
  userId: string;
  initialAddress: string;
  initialCity: string;
  initialRegion: string;
  initialLat: number | null;
  initialLng: number | null;
  onRegionChange: (region: string) => void;
  onSaved?: (hasPosition: boolean) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <p className="font-medium mb-1">Clé API Google Maps manquante</p>
        <p>Ajoutez <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> dans vos variables d&apos;environnement Vercel.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <LocationForm
        listingId={listingId}
        userId={userId}
        initial={{
          address: initialAddress,
          city: initialCity,
          region: initialRegion,
          lat: initialLat,
          lng: initialLng,
        }}
        onRegionChange={onRegionChange}
        onSaved={onSaved}
      />
    </APIProvider>
  );
}
