import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline + unsafe-eval; Google Maps needs *.googleapis.com
      // *.googletagmanager.com : script gtag.js (Google Analytics 4)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.googletagmanager.com js.stripe.com challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com challenges.cloudflare.com",
      "font-src 'self' fonts.gstatic.com data:",
      // img: allow HTTPS broadly (Unsplash, Supabase storage, Google Maps tiles)
      "img-src 'self' data: blob: https:",
      // *.google-analytics.com/*.googletagmanager.com : envoi des événements GA4
      // *.gstatic.com / *.google.com / data: / blob: : requis par les cartes
      // Google vectorielles (Map ID) — sans eux, le fond de carte reste vide.
      "connect-src 'self' *.supabase.co wss://*.supabase.co *.googleapis.com *.gstatic.com *.google.com data: blob: api.stripe.com hooks.stripe.com challenges.cloudflare.com *.google-analytics.com *.googletagmanager.com",
      "frame-src 'self' js.stripe.com hooks.stripe.com challenges.cloudflare.com",
      "worker-src blob:",
      "child-src blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "fgdwhbemzmccchemtzog.supabase.co" },
      // Correctif temporaire — les annonces importées d'Airbnb stockent les
      // URLs brutes de son CDN (a0, a1, a2... .muscache.com) sans les
      // réhéberger sur Supabase Storage. À retirer une fois le téléchargement
      // + réupload des photos à l'import implémenté séparément.
      { protocol: "https", hostname: "*.muscache.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Contourne un comportement de routage confirmé où une route dynamique
  // imbriquée/catch-all déclarée directement à la racine de app/ (sans
  // ancêtre dynamique, ex. app/chalets/[...segments]) ne correspond qu'à
  // exactement 1 segment en production, jamais à plusieurs, alors que la
  // même route déclarée sous app/[locale]/... fonctionne pour n'importe quel
  // nombre de segments. Confirmé par des tests de diagnostic répétés
  // (logs Vercel, plusieurs déploiements, y compris un build sans cache) —
  // voir app/chalets/[...segments]/page.tsx. Ces réécritures redirigent en
  // interne (URL affichée inchangée) vers l'implémentation identique servie
  // sous app/[locale]/chalets/[...segments]/page.tsx, qui fonctionne
  // correctement. Portée volontairement limitée à exactement 1, 2 ou 3
  // segments pour ne jamais toucher /chalets (recherche, 0 segment).
  // L'ancienne route dédiée /chalets/ville/[slug] (2 segments avec un
  // premier segment littéral "ville") a été retirée le 2026-09-17 — son URL
  // aurait autrement été interceptée par la réécriture générique ci-dessous
  // (les réécritures sans phase explicite, comme ici, sont résolues par
  // Next.js avant ses propres routes dynamiques). Les anciens liens
  // /chalets/ville/[slug] redirigent maintenant vers le nouveau chemin
  // région-scopé via renderTwoSegments() dans le fichier catch-all.
  async rewrites() {
    return [
      { source: "/chalets/:a",       destination: "/fr/chalets/:a" },
      { source: "/chalets/:a/:b",    destination: "/fr/chalets/:a/:b" },
      { source: "/chalets/:a/:b/:c", destination: "/fr/chalets/:a/:b/:c" },
    ];
  },
  async redirects() {
    return [
      { source: "/en/chalets",           destination: "/en/cabins",        permanent: true },
      { source: "/en/chalets/:path*",    destination: "/en/cabins/:path*", permanent: true },
      // Renommage région Capitale-Nationale → Québec (2026-09-17), voir lib/regions.ts
      { source: "/chalets/capitale-nationale",    destination: "/chalets/quebec",              permanent: true },
      { source: "/en/cabins/capitale-nationale",  destination: "/en/cabins/quebec-city-region", permanent: true },
      { source: "/en/devenir-hote",      destination: "/en/become-a-host", permanent: true },
      { source: "/en/a-propos",          destination: "/en/about",         permanent: true },
      { source: "/en/comment-ca-marche", destination: "/en/how-it-works",  permanent: true },
      { source: "/en/tarifs",            destination: "/en/pricing",       permanent: true },
      { source: "/en/faq-hotes",         destination: "/en/owner-faq",     permanent: true },
      { source: "/en/conditions",        destination: "/en/terms",         permanent: true },
      { source: "/en/confidentialite",   destination: "/en/privacy",       permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
