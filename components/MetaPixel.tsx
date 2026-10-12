"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { parseConsent, useConsentRaw } from "@/lib/consent";

// Pixel Meta — chargé SEULEMENT si le visiteur a accepté la publicité dans le
// bandeau (lib/consent.ts, Loi 25 : désactivé par défaut). Mesure les visites
// et les conversions (lib/analytics.ts envoie Lead, CompleteRegistration…)
// pour les campagnes Facebook/Instagram. Si le visiteur retire son accord :
// fbq('consent', 'revoke') coupe l'envoi et les témoins _fbp/_fbc sont effacés.
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const consent = parseConsent(useConsentRaw() ?? null);
  const allowed = !!consent?.publicite;
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (allowed) {
      window.fbq?.("consent", "grant");
      return;
    }
    window.fbq?.("consent", "revoke");
    const host = window.location.hostname.replace(/^www\./, "");
    for (const name of ["_fbp", "_fbc"]) {
      for (const domain of ["", `; domain=.${host}`, `; domain=${host}`]) {
        document.cookie = `${name}=; path=/; max-age=0${domain}`;
      }
    }
  }, [allowed]);

  // Navigation côté client : le snippet envoie la première PageView, les
  // suivantes sont envoyées à chaque changement de page.
  useEffect(() => {
    if (!allowed) return;
    if (lastPath.current !== null && lastPath.current !== pathname) {
      window.fbq?.("track", "PageView");
    }
    lastPath.current = pathname;
  }, [allowed, pathname]);

  if (!allowed) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent','grant');
        fbq('init', '${pixelId.replace(/[^0-9]/g, "")}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
