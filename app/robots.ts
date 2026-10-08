import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Connexion, inscription et mot de passe : crawlables exprès, pour que
      // Google voie leur balise noindex (une URL bloquée ici peut quand même
      // être indexée si un lien y mène).
      disallow: [
        "/dashboard",
        "/admin",
        "/api",
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
