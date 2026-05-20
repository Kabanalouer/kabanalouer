import type { MetadataRoute } from "next";
import { getRegionSlugs } from "@/lib/regions";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://kabanalouer.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/chalets`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/devenir-hote`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/comment-ca-marche`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const regionPages: MetadataRoute.Sitemap = getRegionSlugs().map((slug) => ({
    url: `${BASE}/chalets/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Published listings from Supabase
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from("listings")
      .select("id, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    listingPages = (data ?? []).map((l) => ({
      url: `${BASE}/chalets/${l.id}`,
      lastModified: new Date(l.updated_at as string),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Don't fail the build if Supabase is unreachable
  }

  return [...staticPages, ...regionPages, ...listingPages];
}
