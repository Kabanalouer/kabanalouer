import Script from "next/script";

// Google Analytics 4 (gtag.js) — chargé via next/script en stratégie
// "afterInteractive" (recommandée par Next.js pour les scripts d'analytics :
// ni bloquant pour le rendu initial, ni retardé après le chargement complet
// comme "lazyOnload" le ferait pour un script de mesure).
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
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
