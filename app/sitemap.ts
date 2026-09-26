import type { MetadataRoute } from "next";
import { REGIONS, getRegionSlugs, getRegionBySlug, getRegionByDbValue } from "@/lib/regions";
import { isKnownMunicipality } from "@/lib/municipalities";
import { slugify } from "@/lib/slugify";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR } from "@/lib/dogPolicy";
import { createClient } from "@supabase/supabase-js";

const BASE = SITE_URL;

// SEO : même seuil que MIN_CHALETS_FOR_INDEX dans app/chalets/[slug]/page.tsx —
// une région sous ce nombre de chalets actifs est en noindex, donc exclue du
// sitemap aussi (pas de sens à soumettre à Google une page qu'on lui dit de ne
// pas indexer).
const MIN_CHALETS_FOR_INDEX = 1;

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
  // Défaut optimiste (toutes les régions) — écrasé ci-dessous une fois les
  // comptes actifs connus. Reste tel quel si Supabase est injoignable (ne pas
  // faire échouer le build, voir catch plus bas).
  let regionPages: MetadataRoute.Sitemap = REGIONS.flatMap((region) => [
    { url: `${BASE}/chalets/${region.slug}`,        lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE}/en/cabins/${region.slugEn}`,    lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
  ]);

  let listingPages: MetadataRoute.Sitemap = [];
  let dogFriendlyPages: MetadataRoute.Sitemap = [];
  let cityPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id, region, city, listing_number, custom_slug, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    // Supabase ne lève jamais d'exception pour une erreur de requête (colonne
    // inconnue, etc.) — elle retourne { data: null, error } silencieusement,
    // ce que le try/catch autour de ce bloc ne peut pas intercepter. Logué
    // explicitement ici, sinon un futur bug de ce type redevient invisible
    // (voir le bug updated_at/created_at corrigé le 2026-09-18, qui avait
    // vidé tout le sitemap dynamique sans aucune trace nulle part).
    if (listingsError) console.error("sitemap: erreur Supabase sur la requête listings", listingsError);

    listingPages = (listings ?? []).flatMap((l) => {
      const lastMod = new Date(l.created_at as string);
      const listingRow = {
        region: l.region as string | null,
        city: l.city as string | null,
        listing_number: l.listing_number as number | null,
        custom_slug: l.custom_slug as string | null,
      };
      const pathFr = buildListingPath(listingRow, "fr");
      const pathEn = buildListingPath(listingRow, "en");
      // Une annonce sans région connue ou sans listing_number (ne devrait
      // arriver que pour une fiche créée avant cette colonne, jamais backfillée)
      // n'a pas de chemin canonique fiable — jamais soumise à Google sous son UUID brut.
      const entries: MetadataRoute.Sitemap = [];
      if (pathFr) entries.push({ url: `${BASE}${pathFr}`, lastModified: lastMod, changeFrequency: "weekly" as const, priority: 0.8 });
      if (pathEn) entries.push({ url: `${BASE}${pathEn}`, lastModified: lastMod, changeFrequency: "weekly" as const, priority: 0.8 });
      return entries;
    });

    // Ville → région (premier match retenu) : la page ville est maintenant
    // rattachée à sa région dans l'URL (/chalets/[région]/[ville]), voir
    // app/chalets/[...segments]/page.tsx.
    const cityToRegionDbValue = new Map<string, string>();
    for (const l of listings ?? []) {
      const city = l.city as string | null;
      const region = l.region as string | null;
      if (!city || !region || !isKnownMunicipality(city)) continue;
      if (!cityToRegionDbValue.has(city)) cityToRegionDbValue.set(city, region);
    }
    cityPages = [...cityToRegionDbValue.entries()].flatMap(([city, regionDbValue]) => {
      const regionConfig = getRegionByDbValue(regionDbValue);
      if (!regionConfig) return [];
      return [
        {
          url: `${BASE}/chalets/${regionConfig.slug}/${slugify(city)}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.75,
        },
        {
          url: `${BASE}/en/cabins/${regionConfig.slugEn}/${slugify(city)}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.75,
        },
      ];
    });

    // Page « chiens acceptés » : même seuil que les régions (noindex sinon,
    // voir generateMetadata dans app/chalets/[...segments]/page.tsx).
    const { count: dogListingCount } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("dogs_allowed", true);
    if ((dogListingCount ?? 0) >= MIN_CHALETS_FOR_INDEX) {
      dogFriendlyPages = [
        { url: `${BASE}${DOG_FRIENDLY_PATH_FR}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
        { url: `${BASE}${DOG_FRIENDLY_PATH_EN}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      ];
    }

    // Régions sous le seuil : mêmes pages exclues du sitemap qu'en noindex
    // (voir MIN_CHALETS_FOR_INDEX ci-dessus et dans app/chalets/[slug]/page.tsx).
    const activeCountByRegion = new Map<string, number>();
    for (const l of listings ?? []) {
      const region = l.region as string | null;
      if (!region) continue;
      activeCountByRegion.set(region, (activeCountByRegion.get(region) ?? 0) + 1);
    }
    regionPages = getRegionSlugs().flatMap((slug) => {
      const regionConfig = getRegionBySlug(slug);
      const activeCount = regionConfig ? (activeCountByRegion.get(regionConfig.dbValue) ?? 0) : 0;
      if (activeCount < MIN_CHALETS_FOR_INDEX || !regionConfig) return [];
      return [
        { url: `${BASE}/chalets/${regionConfig.slug}`,      lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
        { url: `${BASE}/en/cabins/${regionConfig.slugEn}`,  lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
      ];
    });
  } catch (err) {
    // Don't fail the build if Supabase est injoignable (exception réelle,
    // réseau/auth) — regionPages garde son défaut optimiste (toutes les
    // régions) défini plus haut.
    console.error("sitemap: exception Supabase, repli sur les valeurs par défaut", err);
  }

  return [...staticPages, ...dogFriendlyPages, ...regionPages, ...cityPages, ...listingPages];
}
