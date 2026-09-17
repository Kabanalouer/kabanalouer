import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// cookies() is used via createClient() → force dynamic to avoid DYNAMIC_SERVER_USAGE in production
export const dynamic = "force-dynamic";

import { getRegionBySlug, getRegionByEnSlug, getRegionSlugs } from "@/lib/regions";
import { getRegionContent } from "@/lib/regionsContent";
import { buildListingPath } from "@/lib/listingUrl";
import { normalizePhotos } from "@/lib/photo";
import RegionLanding from "./_components/RegionLanding";
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
// - 3 segments : région/ville/nom-du-chalet (fiche canonique).
interface Props {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; capacity?: string; preview?: string }>;
}

type SearchParams = { checkin?: string; checkout?: string; capacity?: string; preview?: string };

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
async function findListingByChaletSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chaletSlug: string,
  { publishedOnly = false }: { publishedOnly?: boolean } = {}
): Promise<ListingRow | null> {
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

  if (segments.length === 3) {
    return renderThreeSegments(segments as [string, string, string], locale, isEn, sp);
  }

  notFound();
}

async function renderSingleSegment(slug: string, locale: string, isEn: boolean, sp: SearchParams) {
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
  if (!listing) {
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
