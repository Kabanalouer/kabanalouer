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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com js.stripe.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      // img: allow HTTPS broadly (Unsplash, Supabase storage, Google Maps tiles)
      "img-src 'self' data: blob: https:",
      "connect-src 'self' *.supabase.co wss://*.supabase.co *.googleapis.com api.stripe.com hooks.stripe.com",
      "frame-src js.stripe.com hooks.stripe.com",
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
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/en/chalets",           destination: "/en/cabins",        permanent: true },
      { source: "/en/chalets/:path*",    destination: "/en/cabins/:path*", permanent: true },
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
