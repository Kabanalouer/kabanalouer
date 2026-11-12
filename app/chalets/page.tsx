import OwnersSection from "@/components/OwnersSection";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChaletsMapLayout from "@/components/chalets/ChaletsMapLayout";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { parseDogsParam } from "@/lib/dogPolicy";
import { getRegionByDbValue } from "@/lib/regions";
import { isKnownMunicipality } from "@/lib/municipalities";
import { searchListings } from "@/lib/searchListings";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const { city, region } = params;
  const [t, locale] = await Promise.all([getTranslations("chaletsPage"), getLocale()]);
  const isEn = locale === "en";
  // Seules une vraie région ou une vraie municipalité entrent dans le titre :
  // un paramètre arbitraire (?city=n'importe quoi) ne doit jamais s'y retrouver.
  const regionConfig = region ? getRegionByDbValue(region) : undefined;
  const regionLabel = regionConfig ? (isEn ? regionConfig.nameEn : regionConfig.name) : null;
  const cityLabel = city && isKnownMunicipality(city) ? city : null;
  const destination = cityLabel || regionLabel || null;
  const basePath = isEn ? "/en/cabins" : "/chalets";
  // Toute recherche filtrée est une variante de /chalets : explorée (liens
  // suivis) mais jamais indexée — les pages région, ville et par type sont les
  // versions indexables de ces recherches.
  const isFiltered = Object.values(params).some((v) => v !== undefined && v !== "");
  const robots = isFiltered ? { robots: { index: false, follow: true } } : {};

  const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

  if (destination) {
    return {
      ...robots,
      title: t("metaTitleDestination", { destination }),
      description: t("metaDescDestination", { destination }),
      alternates: {
        canonical: basePath,
        languages: { fr: "/chalets", en: "/en/cabins", "x-default": "/chalets" },
      },
      openGraph: {
        title: t("ogTitleDestination", { destination }),
        description: t("ogDescDestination", { destination }),
        url: basePath,
        siteName: "Kabanalouer",
        locale: isEn ? "en_CA" : "fr_CA",
        type: "website",
        images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: t("ogTitleDestination", { destination }),
        description: t("metaDescDestination", { destination }),
        images: [OG_IMAGE],
      },
    };
  }

  return {
    ...robots,
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: {
      canonical: basePath,
      languages: { fr: "/chalets", en: "/en/cabins", "x-default": "/chalets" },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDesc"),
      url: basePath,
      siteName: "Kabanalouer",
      locale: isEn ? "en_CA" : "fr_CA",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("metaDesc"),
      images: [OG_IMAGE],
    },
  };
}

interface PageProps {
  searchParams: Promise<{
    region?: string;
    city?: string;
    capacity?: string;
    checkin?: string;
    checkout?: string;
    minBedrooms?: string;
    minBeds?: string;
    minBathrooms?: string;
    amenities?: string;
    dogs?: string;
    accessible?: string;
    page?: string;
  }>;
}

export default async function ChaletsPage({ searchParams }: PageProps) {
  const {
    region, city, capacity, checkin, checkout,
    minBedrooms, minBeds, minBathrooms, amenities, dogs, accessible, page,
  } = await searchParams;
  const accessibleOnly = accessible === "1";
  const dogsCount = parseDogsParam(dogs);

  const supabase = await createClient();
  const [{ data: { user } }, locale] = await Promise.all([supabase.auth.getUser(), getLocale()]);

  const { listings, pins, total, page: currentPage, pageCount } = await searchListings(
    supabase,
    user?.id ?? null,
    { region, city, capacity, checkin, checkout, minBedrooms, minBeds, minBathrooms, amenities, dogsCount, accessibleOnly, locale: locale === "en" ? "en" : "fr" },
    parseInt(page ?? "1", 10) || 1
  );

  const initialGuests = capacity
    ? parseInt(capacity) >= 25 ? "25+" : capacity
    : undefined;

  const preserveParams: Record<string, string> = {};
  if (minBedrooms) preserveParams.minBedrooms = minBedrooms;
  if (minBeds) preserveParams.minBeds = minBeds;
  if (minBathrooms) preserveParams.minBathrooms = minBathrooms;
  if (amenities) preserveParams.amenities = amenities;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex flex-1 flex-col">
      {/* key : les résultats vivent dans l'état du composant client — le
          remonter à chaque changement de filtre (pastille « Chiens acceptés »,
          fenêtre Filtres) évite d'afficher l'ancienne liste. */}
      <ChaletsMapLayout
        key={JSON.stringify([region, city, capacity, checkin, checkout, minBedrooms, minBeds, minBathrooms, amenities, dogsCount, accessibleOnly])}
        initialListings={listings}
        initialPins={pins}
        initialTotal={total}
        initialPage={currentPage}
        initialPageCount={pageCount}
        currentUserId={user?.id ?? null}
        filters={{ region, city, capacity, checkin, checkout, minBedrooms, minBeds, minBathrooms, amenities, dogs: dogsCount ? String(dogsCount) : undefined, accessible: accessibleOnly ? "1" : undefined }}
      />
      </main>

      {/* Bandeau vert de l'accueil, aussi sur les pages de résultats */}
      <OwnersSection />
      <Footer />
    </div>
  );
}
