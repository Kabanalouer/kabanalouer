"use client";

import { useSyncExternalStore } from "react";

// Consentement aux témoins non essentiels (Loi 25 : désactivés par défaut).
// Mémorisé dans le navigateur (localStorage, clé kbl_consent) — garder ce
// choix est lui-même essentiel. Catégories : mesure (Google Analytics) et
// publicite (pixel Meta, pas encore installé : jamais demandée tant qu'aucun
// outil publicitaire n'est branché). Bandeau : components/ConsentBanner.tsx.

export type Consent = { mesure: boolean; publicite: boolean; date: string; version: 1 };

const KEY = "kbl_consent";
const CHANGE_EVENT = "kbl-consent-change";
const OPEN_EVENT = "kbl-consent-open";

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseConsent(raw: string | null): Consent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Consent>;
    return c.version === 1 ? { mesure: !!c.mesure, publicite: !!c.publicite, date: String(c.date ?? ""), version: 1 } : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { mesure: boolean; publicite: boolean }): void {
  const value: Consent = { ...choice, date: new Date().toISOString(), version: 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // stockage indisponible : le choix vaut pour cette page seulement
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** undefined au rendu serveur (choix inconnu), null si aucun choix encore. */
export function useConsentRaw(): string | null | undefined {
  return useSyncExternalStore(subscribe, readRaw, () => undefined);
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenConsentSettings(callback: () => void): () => void {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}
