import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// cookies() is used via createClient() → force dynamic to avoid DYNAMIC_SERVER_USAGE in production
export const dynamic = "force-dynamic";

import { getRegionBySlug, getRegionByEnSlug, getRegionSlugs } from "@/lib/regions";
import { getRegionContent } from "@/lib/regionsContent";
import { buildListingPath } from "@/lib/listingUrl";
import RegionLanding from "./RegionLanding";
import ListingDetail from "./ListingDetail";
import { getLocale } from "next-intl/server";

// SEO : une région sans chalet actif publié est du contenu quasi vide/dupliqué
// aux yeux de Google (même gabarit sur les 15 pages région) — reste non-indexable
// tant que ce seuil n'est pas atteint. Garder ce nombre synchronisé avec le
// seuil équivalent dans app/sitemap.ts (régions exclues du sitemap).
const MIN_CHALETS_FOR_INDEX = 1;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; capacity?: string; preview?: string }>;
}

export async function generateStaticParams() {
  return getRegionSlugs().map((s) => ({ slug: s }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";
  const supabase = await createClient();

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
  // toute façon qu'une redirection 308 pour une annonce publiée (voir
  // ListingOrRegionPage plus bas), donc pas de métadonnées à calculer ici.
  return {};
}

export default async function ListingOrRegionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  const isEn = locale === "en";

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
  const [{ data: listingBySlug }, { data: { user } }] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .or(`slug_fr.eq.${slug},slug_en.eq.${slug}`)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  let listing = listingBySlug;

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
  // (PreviewModal.tsx), et un brouillon n'a de toute façon jamais de slug
  // (ensureListingSlugs() n'est appelé qu'à la publication).
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
