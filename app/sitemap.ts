import type { MetadataRoute } from "next";
import { getRegionSlugs } from "@/lib/regions";

const BASE = "https://kabanalouer.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/chalets`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/comment-ca-marche`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/devenir-hote`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const regionPages: MetadataRoute.Sitemap = getRegionSlugs().map((slug) => ({
    url: `${BASE}/chalets/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...regionPages];
}
