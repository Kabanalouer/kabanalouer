import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "fgdwhbemzmccchemtzog.supabase.co" },
    ],
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
