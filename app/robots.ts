import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/login", "/signup", "/messages", "/favoris"],
    },
    sitemap: "https://kabanalouer.ca/sitemap.xml",
  };
}
