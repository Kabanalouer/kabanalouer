"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { parseConsent, useConsentRaw } from "@/lib/consent";
import { NEW_SIGNUP_COOKIE } from "@/lib/newSignupCookie";

// Envoie « sign_up » (GA4) / CompleteRegistration (Meta) pour une inscription
// Google, signalée par le témoin posé dans /auth/callback. Le pixel Meta se
// charge après l'hydratation : on attend window.fbq (max 5 s) si le visiteur
// a accepté la publicité, sinon l'événement partirait seulement vers GA4.
export default function SignupTracker() {
  const consentRaw = useConsentRaw();

  useEffect(() => {
    if (consentRaw === undefined) return;
    const match = document.cookie.match(new RegExp(`(?:^|; )${NEW_SIGNUP_COOKIE}=([^;]*)`));
    if (!match) return;
    const [method, role] = decodeURIComponent(match[1]).split(".");
    if (method !== "google" || (role !== "host" && role !== "traveler")) return;
    document.cookie = `${NEW_SIGNUP_COOKIE}=; path=/; max-age=0`;

    const waitForPixel = !!parseConsent(consentRaw)?.publicite;
    let tries = 0;
    const send = () => {
      if (waitForPixel && !window.fbq && tries < 20) {
        tries += 1;
        timer = window.setTimeout(send, 250);
        return;
      }
      trackEvent("sign_up", { method: "google", role });
    };
    let timer = window.setTimeout(send, 0);
    return () => window.clearTimeout(timer);
  }, [consentRaw]);

  return null;
}
