import Script from "next/script";

// Google Analytics 4 (gtag.js) — chargé via next/script en stratégie
// "lazyOnload" : gtag.js (~170 Ko) est téléchargé une fois la page au repos,
// pour ne pas concurrencer le rendu et l'interactivité (audit mobile). Les
// appels gtag() faits avant restent dans dataLayer et sont envoyés ensuite.
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
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
