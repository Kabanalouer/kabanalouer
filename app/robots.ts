import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api",
        "/login",
        "/signup",
        "/messages",
        "/favoris",
        "/en/dashboard",
        "/en/admin",
        "/en/messages",
        "/en/favoris",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
