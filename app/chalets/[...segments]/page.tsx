import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// cookies() is used via createClient() → force dynamic to avoid DYNAMIC_SERVER_USAGE in production
export const dynamic = "force-dynamic";

import { getRegionBySlug, getRegionByEnSlug, getRegionByDbValue, getRegionSlugs } from "@/lib/regions";
import { getRegionContent } from "@/lib/regionsContent";
import { buildListingPath } from "@/lib/listingUrl";
import { normalizePhotos } from "@/lib/photo";
import { slugify } from "@/lib/slugify";
import { isKnownMunicipality } from "@/lib/municipalities";
import RegionLanding from "./_components/RegionLanding";
import CityLanding from "./_components/CityLanding";
import DogFriendlyLanding, { buildDogFriendlyMeta } from "./_components/DogFriendlyLanding";
import { DOG_FRIENDLY_PATH_EN, DOG_FRIENDLY_PATH_FR, DOG_FRIENDLY_SLUG_EN, DOG_FRIENDLY_SLUG_FR } from "@/lib/dogPolicy";
import ListingDetail from "./_components/ListingDetail";
import { getLocale } from "next-intl/server";

// SEO : une région sans chalet actif publié est du contenu quasi vide/dupliqué
// aux yeux de Google (même gabarit sur les 15 pages région) — reste non-indexable
// tant que ce seuil n'est pas atteint. Garder ce nombre synchronisé avec le
// seuil équivalent dans app/sitemap.ts (régions exclues du sitemap).
const MIN_CHALETS_FOR_INDEX = 1;

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

// Route "catch-all" volontaire (au lieu de deux dossiers dynamiques imbriqués
// app/chalets/[slug]/page.tsx + app/chalets/[slug]/[city]/[chaletSlug]/page.tsx) :
// cette dernière structure, bien que compilée sans erreur et listée dans le
// build, ne routait jamais correctement en production (confirmé par logs de
// diagnostic sur plusieurs déploiements — le code de la page n'était jamais
// atteint). Un seul segment catch-all évite ce problème (mécanisme de
// correspondance différent dans Next.js) tout en gardant les mêmes URLs :
// - 1 segment  : région (/chalets/laurentides) ou fiche historique (slug
//   plat / UUID, toujours redirigée vers le chemin canonique à 3 segments).
// - 2 segments : région/ville (page ville SEO, /chalets/laurentides/mille-isles).
//   Le premier segment littéral "ville" (FR) / "city" (EN) de l'ancien schéma
//   /chalets/ville/[slug] est détecté et redirigé vers ce nouveau chemin
//   région-scopé — voir renderTwoSegments().
// - 3 segments : région/ville/nom-du-chalet (fiche canonique).
interface Props {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; capacity?: string; dogs?: string; preview?: string }>;
}

type SearchParams = { checkin?: string; checkout?: string; capacity?: string; dogs?: string; preview?: string };

type ListingRow = Record<string, unknown> & {
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  photos: unknown;
  region: string | null;
  city: string | null;
  is_published: boolean | null;
  custom_slug: string | null;
  listing_number: number | null;
  previous_custom_slug: string | null;
};

// Résout une fiche par son dernier segment d'URL : lien personnalisé
// (custom_slug) ou numéro d'annonce (listing_number, comparé uniquement si le
// segment est purement numérique). Si rien ne correspond, retombe sur
// previous_custom_slug — le proprio a changé son lien personnalisé depuis
// (voir CLAUDE.md section 9) — pour que l'ancien lien redirige vers le
// chemin canonique actuel au lieu de 404. `publishedOnly` restreint la
// recherche aux fiches publiées (utilisé pour les métadonnées uniquement ;
// renderThreeSegments laisse RLS trancher, comme pour l'aperçu de brouillon).
// Un custom_slug/slug_fr/slug_en valide ne contient jamais autre chose que
// [a-z0-9-] (voir validateCustomSlugFormat()/slugify()) — rejeter tout le
// reste AVANT de construire une chaîne de filtre PostgREST .or() évite
// l'injection de filtre plutôt que d'essayer d'échapper chaletSlug (issu
// directement du segment d'URL, donc contrôlé par le visiteur).
const SAFE_SEGMENT_PATTERN = /^[a-z0-9-]{1,60}$/;

async function findListingByChaletSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chaletSlug: string,
  { publishedOnly = false }: { publishedOnly?: boolean } = {}
): Promise<ListingRow | null> {
  if (!SAFE_SEGMENT_PATTERN.test(chaletSlug)) return null;

  const asNumber = /^\d+$/.test(chaletSlug) ? Number(chaletSlug) : null;
  const orFilter = asNumber !== null
    ? `custom_slug.eq.${chaletSlug},listing_number.eq.${asNumber}`
    : `custom_slug.eq.${chaletSlug}`;

  let primaryQuery = supabase.from("listings").select("*").or(orFilter);
  if (publishedOnly) primaryQuery = primaryQuery.eq("is_published", true);
  const { data: primary } = await primaryQuery.maybeSingle();
  if (primary) return primary as ListingRow;

  let previousQuery = supabase.from("listings").select("*").eq("previous_custom_slug", chaletSlug);
  if (publishedOnly) previousQuery = previousQuery.eq("is_published", true);
  const { data: viaPrevious } = await previousQuery.maybeSingle();
  return (viaPrevious as ListingRow) ?? null;
}

export async function generateStaticParams() {
  return getRegionSlugs().map((s) => ({ segments: [s] }));
}

export async function generateMetadata({ params }: Props) {
  const { segments } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";
  const supabase = await createClient();

  if (segments.length === 1) {
    const [slug] = segments;

    if (slug === (isEn ? DOG_FRIENDLY_SLUG_EN : DOG_FRIENDLY_SLUG_FR)) {
      const { title, description } = buildDogFriendlyMeta(isEn);
      const { count: dogListingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("dogs_allowed", true);
      const canonical = isEn ? DOG_FRIENDLY_PATH_EN : DOG_FRIENDLY_PATH_FR;
      return {
        title,
        description,
        ...((dogListingCount ?? 0) < MIN_CHALETS_FOR_INDEX
          ? { robots: { index: false, follow: true } }
          : {}),
        alternates: {
          canonical,
          languages: { fr: DOG_FRIENDLY_PATH_FR, en: DOG_FRIENDLY_PATH_EN, "x-default": DOG_FRIENDLY_PATH_FR },
        },
        openGraph: { title, description, url: canonical },
        twitter: { title, description },
      };
    }

    // Region landing page — slug résolu dans la langue de la route (FR sur
    // /chalets/[slug], EN sur /en/cabins/[slug]) puisque les slugs de région
    // divergent désormais entre les deux langues (voir lib/regions.ts).
    const region = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
    if (region) {
      const rc = getRegionContent(region.slug);

      const { count: activeListingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .eq("region", region.dbValue);

      // Titre/description personnalisés (regionsContent.ts) en priorité —
      // le format générique n'est qu'un filet pour une région qui n'en a pas encore.
      const title = isEn
        ? (rc?.meta_title_en ?? `Cabin rental | ${region.nameEn}`)
        : (rc?.meta_title_fr ?? `Location de chalet | ${region.name}`);
      const description = isEn
        ? (rc?.meta_description_en ?? `Find your cabin for rent ${rc?.locative_en ?? `in ${region.nameEn}`}, with no service fees.`)
        : (rc?.meta_description_fr ?? `Trouvez votre chalet à louer ${region.locative}, sans frais de service.`);

      return {
        title,
        description,
        ...((activeListingCount ?? 0) < MIN_CHALETS_FOR_INDEX
          ? { robots: { index: false, follow: true } }
          : {}),
        alternates: {
          canonical: isEn ? `/en/cabins/${region.slugEn}` : `/chalets/${region.slug}`,
          languages: { fr: `/chalets/${region.slug}`, en: `/en/cabins/${region.slugEn}`, "x-default": `/chalets/${region.slug}` },
        },
        openGraph: {
          title,
          description,
          url: isEn ? `/en/cabins/${region.slugEn}` : `/chalets/${region.slug}`,
          images: [{ url: region.heroImage, width: 1920, height: 1080, alt: isEn ? `Cabin rental ${rc?.locative_en ?? `in ${region.nameEn}`}` : `Chalet ${region.locative}` }],
        },
        twitter: { title, description, images: [region.heroImage] },
      };
    }

    // Legacy listing URL (slug plat ou UUID) — la vraie page canonique à 3
    // segments a sa propre generateMetadata ; visiter cette URL ne produit de
    // toute façon qu'une redirection 308 pour une annonce publiée, donc pas
    // de métadonnées à calculer ici.
    return {};
  }

  if (segments.length === 2) {
    const [slug, citySlug] = segments;

    // Ancien schéma /chalets/ville/[slug] (FR) ou /en/cabins/city/[slug]
    // (EN) — ne produit qu'une redirection 308, jamais de métadonnées ici.
    if (slug === (isEn ? "city" : "ville")) return {};

    const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
    if (!regionConfig) return {};

    const { data: cityRows } = await supabase
      .from("listings")
      .select("city")
      .eq("is_published", true)
      .eq("region", regionConfig.dbValue)
      .not("city", "is", null);
    const cityName = [...new Set((cityRows ?? []).map((r) => r.city as string).filter(Boolean))]
      .filter(isKnownMunicipality)
      .find((c) => slugify(c) === citySlug);
    if (!cityName) return {};

    // Cible les requêtes "location chalet {ville}" / "cabin rental {ville}" —
    // volontairement plus court/direct que le H1 de la page (voir CityLanding.tsx).
    const title = isEn ? `Cabin rental in ${cityName}` : `Location de chalet à ${cityName}`;
    const description = isEn
      ? `Find your cabin for rent in ${cityName}, ${regionConfig.nameEn}. Direct contact with owners, no service fees.`
      : `Trouvez votre chalet à louer à ${cityName}, ${regionConfig.name}. Contact direct avec les propriétaires, aucun frais de service.`;

    const pathFr = `/chalets/${regionConfig.slug}/${citySlug}`;
    const pathEn = `/en/cabins/${regionConfig.slugEn}/${citySlug}`;
    const canonicalPath = isEn ? pathEn : pathFr;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalPath,
        languages: { fr: pathFr, en: pathEn, "x-default": pathFr },
      },
      openGraph: { title, description, url: canonicalPath },
      twitter: { title, description },
    };
  }

  if (segments.length === 3) {
    const [slug, , chaletSlug] = segments;

    const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
    if (!regionConfig) return {};

    const data = await findListingByChaletSlug(supabase, chaletSlug, { publishedOnly: true });

    if (!data) return {};

    const rawTitle = (isEn && data.title_en) ? data.title_en : data.title;
    const rawDesc = (isEn && data.description_en) ? data.description_en : data.description;
    const location = [data.city, data.region].filter(Boolean).join(", ");
    const title = location ? `${rawTitle} | ${location}` : rawTitle;
    const description = (rawDesc as string | null)?.slice(0, 160) ?? "";
    const photos = normalizePhotos(data.photos);
    const ogImage = photos[0]?.url ?? DEFAULT_PHOTO;

    const pathFr = buildListingPath(data, "fr");
    const pathEn = buildListingPath(data, "en");
    const canonicalPath = isEn ? pathEn : pathFr;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalPath ?? undefined,
        languages: {
          ...(pathFr ? { fr: pathFr } : {}),
          ...(pathEn ? { en: pathEn } : {}),
          "x-default": pathFr ?? pathEn ?? undefined,
        },
      },
      openGraph: {
        title,
        description,
        url: canonicalPath ?? undefined,
        type: "article",
        images: [{ url: ogImage, width: 1200, height: 630, alt: rawTitle }],
      },
      twitter: { title, description, images: [ogImage] },
    };
  }

  return {};
}

export default async function ChaletPage({ params, searchParams }: Props) {
  const { segments } = await params;
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  const isEn = locale === "en";

  if (segments.length === 1) {
    return renderSingleSegment(segments[0], locale, isEn, sp);
  }

  if (segments.length === 2) {
    return renderTwoSegments(segments as [string, string], isEn);
  }

  if (segments.length === 3) {
    return renderThreeSegments(segments as [string, string, string], locale, isEn, sp);
  }

  notFound();
}

async function renderSingleSegment(slug: string, locale: string, isEn: boolean, sp: SearchParams) {
  if (slug === (isEn ? DOG_FRIENDLY_SLUG_EN : DOG_FRIENDLY_SLUG_FR)) return <DogFriendlyLanding />;

  // Region landing page — check before any DB query
  const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
  if (regionConfig) return <RegionLanding regionConfig={regionConfig} />;

  const supabase = await createClient();

  // Try slug-based lookup first, then fall back to UUID (backward compat).
  // Pas de filtre is_published ici : la RLS sur `listings` s'en charge déjà
  // ("Tout le monde voit les listings publiés" = is_published OR host_id =
  // auth.uid(), + "Les admins gèrent tous les listings") — un visiteur non
  // concerné reçoit simplement zéro ligne pour un brouillon, exactement
  // comme avant.
  const [listingBySlug, { data: { user } }] = await Promise.all([
    findListingByChaletSlug(supabase, slug),
    supabase.auth.getUser(),
  ]);

  let listing = listingBySlug;

  // Repli additionnel : ancien schéma d'URL à 1 segment basé sur slug_fr/
  // slug_en (avant l'introduction du numéro d'annonce/lien personnalisé) —
  // un lien de cette époque déjà partagé/indexé doit continuer à fonctionner.
  // Même garde-fou que findListingByChaletSlug() : un slug_fr/slug_en valide
  // ne contient jamais autre chose que [a-z0-9-] (voir lib/slugify.ts).
  if (!listing && SAFE_SEGMENT_PATTERN.test(slug)) {
    const { data: legacyBySlug } = await supabase
      .from("listings")
      .select("*")
      .or(`slug_fr.eq.${slug},slug_en.eq.${slug}`)
      .maybeSingle();
    listing = legacyBySlug as ListingRow | null;
  }

  if (!listing) {
    const { data: byId } = await supabase
      .from("listings")
      .select("*")
      .eq("id", slug)
      .maybeSingle();
    listing = byId;
  }

  if (!listing) notFound();

  // URL historique (slug plat ou UUID) pour une annonce PUBLIÉE : toujours
  // rediriger vers le chemin canonique à 3 segments plutôt que de rendre ici.
  // Les brouillons (is_published = false) restent rendus directement sur
  // cette URL — c'est le mécanisme utilisé par "Aperçu de mon annonce"
  // (PreviewModal.tsx), qui pointe toujours vers l'UUID brut.
  if (listing.is_published) {
    const targetPath = buildListingPath(listing, isEn ? "en" : "fr");
    if (targetPath) {
      const qs = new URLSearchParams();
      if (sp.checkin) qs.set("checkin", sp.checkin);
      if (sp.checkout) qs.set("checkout", sp.checkout);
      if (sp.capacity) qs.set("capacity", sp.capacity);
      if (sp.dogs) qs.set("dogs", sp.dogs);
      if (sp.preview) qs.set("preview", sp.preview);
      const query = qs.toString();
      permanentRedirect(query ? `${targetPath}?${query}` : targetPath);
    }
  }

  return (
    <ListingDetail
      listing={listing}
      user={user}
      searchParams={sp}
      locale={locale}
      isPreviewFrame={sp.preview === "1"}
    />
  );
}

async function renderTwoSegments([slug, citySlug]: [string, string], isEn: boolean) {
  const supabase = await createClient();

  // Ancien schéma /chalets/ville/[slug] (FR) ou /en/cabins/city/[slug] (EN) —
  // premier segment autrefois un mot-clé littéral plutôt qu'un slug de
  // région. Retrouve la région réelle de la ville (parmi TOUTES les régions,
  // pas seulement celle qu'on croirait deviner) et redirige vers le chemin
  // canonique région-scopé plutôt que de casser un lien déjà partagé/indexé.
  if (slug === (isEn ? "city" : "ville")) {
    const { data: allCityRows } = await supabase
      .from("listings")
      .select("city, region")
      .eq("is_published", true)
      .not("city", "is", null);

    for (const row of allCityRows ?? []) {
      const cityName = row.city as string;
      if (!isKnownMunicipality(cityName) || slugify(cityName) !== citySlug) continue;
      const regionConfig = getRegionByDbValue(row.region as string);
      if (!regionConfig) continue;
      permanentRedirect(
        isEn
          ? `/en/cabins/${regionConfig.slugEn}/${slugify(cityName)}`
          : `/chalets/${regionConfig.slug}/${slugify(cityName)}`
      );
    }
    notFound();
  }

  const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
  if (!regionConfig) notFound();

  const { data: cityRows } = await supabase
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .eq("region", regionConfig.dbValue)
    .not("city", "is", null);
  const cityName = [...new Set((cityRows ?? []).map((r) => r.city as string).filter(Boolean))]
    .filter(isKnownMunicipality)
    .find((c) => slugify(c) === citySlug);
  // Ville sans chalet publié dans cette région : même approche que l'ancien
  // /chalets/ville/[slug] (jamais de redirection, 404 propre) — cohérent
  // avec le repli déjà en place pour une région sans fiche active.
  if (!cityName) notFound();

  return <CityLanding regionConfig={regionConfig} cityName={cityName} />;
}

async function renderThreeSegments([slug, city, chaletSlug]: [string, string, string], locale: string, isEn: boolean, sp: SearchParams) {
  const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
  if (!regionConfig) notFound();

  const supabase = await createClient();
  const [listing, { data: { user } }] = await Promise.all([
    findListingByChaletSlug(supabase, chaletSlug),
    supabase.auth.getUser(),
  ]);

  if (!listing) notFound();

  // Valide que région/ville dans l'URL correspondent bien à l'annonce
  // trouvée — sinon redirige vers son chemin canonique actuel (annonce
  // déplacée, lien obsolète, faute de frappe dans le segment ville…). Le
  // chemin "affiché" reconstruit ici est toujours /chalets/... (ou
  // /en/cabins/...) — jamais /fr/chalets/... — même si cette fonction est
  // exécutée pour le FR via la réécriture interne définie dans
  // next.config.ts (voir commentaire là-bas) : le navigateur ne voit jamais
  // ce préfixe "/fr", seul Next.js l'utilise en interne pour la résolution
  // de route.
  const canonicalPath = buildListingPath(listing, isEn ? "en" : "fr");
  const currentPath = `${isEn ? "/en/cabins" : "/chalets"}/${slug}/${city}/${chaletSlug}`;
  if (!canonicalPath) notFound();
  if (canonicalPath !== currentPath) {
    permanentRedirect(canonicalPath);
  }

  return (
    <ListingDetail
      listing={listing}
      user={user}
      searchParams={sp}
      locale={locale}
      isPreviewFrame={sp.preview === "1"}
    />
  );
}
