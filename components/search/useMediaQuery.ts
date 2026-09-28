"use client";

import { useSyncExternalStore } from "react";

// Vrai quand la media query correspond. Toujours faux côté serveur et au
// premier rendu d'hydratation (pas d'écart serveur/client), puis suit les
// changements (rotation, redimensionnement).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Téléphones : la recherche passe par la feuille plein écran sous 768px.
export const PHONE_QUERY = "(max-width: 767.98px)";
