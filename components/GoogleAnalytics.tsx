"use client";

import { useEffect } from "react";
import Script from "next/script";
import { parseConsent, useConsentRaw } from "@/lib/consent";

// Google Analytics 4 (gtag.js) — chargé SEULEMENT si le visiteur a accepté la
// mesure d'audience dans le bandeau (lib/consent.ts, Loi 25 : désactivé par
// défaut). Stratégie "lazyOnload" : gtag.js (~170 Ko) est téléchargé une fois
// la page au repos. Les appels gtag() faits avant restent dans dataLayer.
// Si le visiteur retire son accord : GA est coupé pour la page en cours et
// ses témoins _ga sont effacés.
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const consent = parseConsent(useConsentRaw() ?? null);
  const allowed = !!consent?.mesure;

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w[`ga-disable-${measurementId}`] = !allowed;
    if (!allowed) {
      const host = window.location.hostname.replace(/^www\./, "");
      for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
        if (name === "_ga" || name.startsWith("_ga_")) {
          for (const domain of ["", `; domain=.${host}`, `; domain=${host}`]) {
            document.cookie = `${name}=; path=/; max-age=0${domain}`;
          }
        }
      }
    }
  }, [allowed, measurementId]);

  if (!allowed) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
