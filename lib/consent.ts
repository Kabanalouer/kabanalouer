"use client";

import { useSyncExternalStore } from "react";

// Consentement aux témoins non essentiels (Loi 25 : désactivés par défaut).
// Mémorisé dans le navigateur (localStorage, clé kbl_consent) — garder ce
// choix est lui-même essentiel. Catégories : mesure (Google Analytics) et
// publicite (pixel Meta, components/MetaPixel.tsx). La catégorie publicite
// n'est demandée que si NEXT_PUBLIC_META_PIXEL_ID est défini (on ne demande
// jamais une catégorie inutilisée). Bandeau : components/ConsentBanner.tsx.

export type Consent = {
  mesure: boolean;
  publicite: boolean;
  /** vrai si la question « publicité » a été posée lors de ce choix */
  publiciteAsked: boolean;
  date: string;
  version: 1;
};

export const META_PIXEL_ENABLED = !!process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
    if (c.version !== 1) return null;
    return {
      mesure: !!c.mesure,
      publicite: !!c.publicite,
      publiciteAsked: !!c.publiciteAsked,
      date: String(c.date ?? ""),
      version: 1,
    };
  } catch {
    return null;
  }
}

/** Vrai s'il faut (re)montrer le bandeau : aucun choix, ou la question
 *  publicité n'a jamais été posée alors que le pixel est maintenant branché. */
export function needsConsentChoice(consent: Consent | null): boolean {
  if (!consent) return true;
  return META_PIXEL_ENABLED && !consent.publiciteAsked;
}

export function saveConsent(choice: { mesure: boolean; publicite: boolean }): void {
  const value: Consent = {
    mesure: choice.mesure,
    publicite: META_PIXEL_ENABLED && choice.publicite,
    publiciteAsked: META_PIXEL_ENABLED,
    date: new Date().toISOString(),
    version: 1,
  };
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
