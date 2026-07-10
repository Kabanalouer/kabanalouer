import type { MetadataRoute } from "next";
import { getRegionSlugs } from "@/lib/regions";
import { slugify } from "@/lib/slugify";
import { SITE_URL } from "@/lib/siteUrl";
import { createClient } from "@supabase/supabase-js";

const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages FR + EN ─────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,                  lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/en`,                lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/chalets`,           lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/en/cabins`,         lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/regions`,           lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/en/regions`,        lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/devenir-hote`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/en/become-a-host`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tarifs`,            lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/en/pricing`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/comment-ca-marche`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/en/how-it-works`,   lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/faq-hotes`,         lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/en/owner-faq`,      lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/a-propos`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/en/about`,          lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`,           lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/en/contact`,        lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/conditions`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/en/terms`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/confidentialite`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/en/privacy`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  // ── Region pages FR + EN ─────────────────────────────────────────────────────
  const regionPages: MetadataRoute.Sitemap = getRegionSlugs().flatMap((slug) => [
    { url: `${BASE}/chalets/${slug}`,    lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE}/en/cabins/${slug}`,  lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
  ]);

  let listingPages: MetadataRoute.Sitemap = [];
  let cityPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: listings } = await supabase
      .from("listings")
      .select("id, city, slug_fr, slug_en, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    listingPages = (listings ?? []).flatMap((l) => {
      const lastMod = new Date(l.updated_at as string);
      const slugFr = (l.slug_fr as string | null) ?? l.id;
      const slugEn = (l.slug_en as string | null) ?? null;
      const entries: MetadataRoute.Sitemap = [
        { url: `${BASE}/chalets/${slugFr}`, lastModified: lastMod, changeFrequency: "weekly" as const, priority: 0.8 },
      ];
      if (slugEn) {
        entries.push({ url: `${BASE}/en/cabins/${slugEn}`, lastModified: lastMod, changeFrequency: "weekly" as const, priority: 0.8 });
      }
      return entries;
    });

    const distinctCities = [
      ...new Set(
        (listings ?? [])
          .map((l) => l.city as string | null)
          .filter((c): c is string => !!c)
      ),
    ];
    cityPages = distinctCities.flatMap((city) => [
      {
        url: `${BASE}/chalets/ville/${slugify(city)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      },
      {
        url: `${BASE}/en/cabins/city/${slugify(city)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      },
    ]);
  } catch {
    // Don't fail the build if Supabase is unreachable
  }

  return [...staticPages, ...regionPages, ...cityPages, ...listingPages];
}
