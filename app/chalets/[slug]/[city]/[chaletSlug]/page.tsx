import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// cookies() is used via createClient() → force dynamic to avoid DYNAMIC_SERVER_USAGE in production
export const dynamic = "force-dynamic";

import { getRegionBySlug, getRegionByEnSlug } from "@/lib/regions";
import { buildListingPath } from "@/lib/listingUrl";
import { normalizePhotos } from "@/lib/photo";
import ListingDetail from "../../_components/ListingDetail";
import { getLocale } from "next-intl/server";

const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80";

// Le premier segment ("slug" — le nom du dossier réutilise celui de
// app/chalets/[slug]/, requis par Next.js pour un même niveau de route) est
// le slug de RÉGION, pas celui du chalet. Le vrai nom du chalet est le
// troisième segment, chaletSlug.
interface Props {
  params: Promise<{ slug: string; city: string; chaletSlug: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; capacity?: string; preview?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, chaletSlug } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";

  const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
  if (!regionConfig) return {};

  const supabase = await createClient();
  const slugColumn = isEn ? "slug_en" : "slug_fr";
  const { data } = await supabase
    .from("listings")
    .select("title, title_en, region, city, description, description_en, photos, slug_fr, slug_en")
    .eq(slugColumn, chaletSlug)
    .eq("is_published", true)
    .maybeSingle();

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

export default async function ListingPage({ params, searchParams }: Props) {
  const { slug, city, chaletSlug } = await params;
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  const isEn = locale === "en";

  const regionConfig = isEn ? getRegionByEnSlug(slug) : getRegionBySlug(slug);
  if (!regionConfig) notFound();

  const supabase = await createClient();
  const slugColumn = isEn ? "slug_en" : "slug_fr";
  const [{ data: listing }, { data: { user } }] = await Promise.all([
    supabase.from("listings").select("*").eq(slugColumn, chaletSlug).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!listing) notFound();

  // Valide que région/ville dans l'URL correspondent bien à l'annonce
  // trouvée — sinon redirige vers son chemin canonique actuel (annonce
  // déplacée, lien obsolète, faute de frappe dans le segment ville…).
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
