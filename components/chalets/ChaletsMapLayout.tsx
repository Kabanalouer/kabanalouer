"use client";

import ListYourCabinPromo from "@/components/ListYourCabinPromo";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { getRegionByDbValue } from "@/lib/regions";
import ListingCard, { type Listing } from "@/components/ListingCard";
import type { MapBounds } from "./ChaletsMap";
import ChaletsSearchSubBar from "./ChaletsSearchSubBar";
import { useTranslations, useLocale } from "next-intl";
import { useMediaQuery } from "@/components/search/useMediaQuery";

export interface ListingForMap extends Listing {
  lat: number | null;
  lng: number | null;
}

const ChaletsMap = dynamic(() => import("./ChaletsMap"), { ssr: false });

interface Props {
  initialListings: ListingForMap[];
  currentUserId: string | null;
  filters: {
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
  };
}

export default function ChaletsMapLayout({ initialListings, currentUserId, filters }: Props) {
  const t = useTranslations("chaletsMap");
  const locale = useLocale();
  const regionLabel = filters.region && locale === "en" ? getRegionByDbValue(filters.region)?.nameEn ?? filters.region : filters.region;
  const destination = filters.city || regionLabel || null;
  const pageTitle = destination ? t("titleDestination", { destination }) : t("titleAll");
  const [listings, setListings] = useState<ListingForMap[]>(initialListings);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  // La carte de droite (split view) n'est montée qu'à partir de lg : sur
  // téléphone et tablette, elle restait montée dans un conteneur masqué et
  // chargeait quand même Google Maps (~240 Ko) en vue liste. Faux au rendu
  // serveur et à l'hydratation.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -100px 0px" }
    );
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  const handleBoundsChange = useCallback(async (bounds: MapBounds) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLng: bounds.minLng.toString(),
        maxLng: bounds.maxLng.toString(),
        ...(filters.region && { region: filters.region }),
        ...(filters.city && { city: filters.city }),
        ...(filters.capacity && { capacity: filters.capacity }),
        ...(filters.checkin && { checkin: filters.checkin }),
        ...(filters.checkout && { checkout: filters.checkout }),
        ...(filters.minBedrooms && { minBedrooms: filters.minBedrooms }),
        ...(filters.minBeds && { minBeds: filters.minBeds }),
        ...(filters.minBathrooms && { minBathrooms: filters.minBathrooms }),
        ...(filters.amenities && { amenities: filters.amenities }),
        ...(filters.dogs && { dogs: filters.dogs }),
        ...(filters.accessible && { accessible: filters.accessible }),
        locale,
      });
      const res = await fetch(`/api/listings/geo?${params}`);
      if (res.ok) setListings(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [filters]);


  const EmptyState = () => (
    <div className="col-span-2 py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <p className="font-semibold text-charcoal-800 mb-1">{t("noResults")}</p>
      <p className="text-charcoal-400 text-base">{t("noResultsHint")}</p>
      <div className="mt-10 px-2">
        <ListYourCabinPromo />
      </div>
    </div>
  );

  const SkeletonCard = () => (
    <div className="animate-pulse">
      <div className="aspect-[20/19] rounded-xl bg-charcoal-100 mb-3" />
      <div className="h-4 bg-charcoal-100 rounded w-4/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-3/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-2/5" />
    </div>
  );

  const listGrid = (cols: string) => (
    <>
    {/* Titre invisible : garde l'ordre des titres (h1 → h2 → h3 des cartes) pour les lecteurs d'écran */}
    <h2 className="sr-only">{locale === "en" ? "Results" : "Résultats"}</h2>
    <div className={`grid ${cols} gap-x-5 gap-y-8`}>
      {isLoading ? (
        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        listings.map((listing, i) => (
          <div
            key={listing.id}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="rounded-xl"
          >
            {/* 2 premières cartes : photo chargée en priorité (élément LCP) */}
            <ListingCard listing={listing} currentUserId={currentUserId} priority={i < 2} />
          </div>
        ))
      )}
    </div>
    </>
  );

  const mapFrame = (height: string, expanded = false) => (
    <div
      className="rounded-2xl overflow-hidden border border-[#e8e8e8] w-full"
      style={{ height, boxShadow: "0 2px 16px rgba(0,0,0,0.10)" }}
    >
      <ChaletsMap
        listings={listings}
        hoveredId={hoveredId}
        onHoverChange={setHoveredId}
        onBoundsChange={handleBoundsChange}
        destination={{ city: filters.city, region: filters.region }}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((v) => !v)}
      />
    </div>
  );

  return (
    <>
      {/* Barre de recherche compacte mobile — sticky sous la navbar */}
      <ChaletsSearchSubBar
        region={filters.region}
        city={filters.city}
        checkin={filters.checkin}
        checkout={filters.checkout}
        capacity={filters.capacity}
        minBedrooms={filters.minBedrooms}
        minBeds={filters.minBeds}
        minBathrooms={filters.minBathrooms}
        amenities={filters.amenities}
        dogs={filters.dogs}
        accessible={filters.accessible}
      />

      {/* ── DESKTOP: split layout ── */}
      <div className="hidden lg:flex gap-5 items-start">

        {/* Left: 55% — hidden when expanded */}
        <div className={`flex-[55] min-w-0 px-5 pt-5 pb-10 ${isExpanded ? "hidden" : ""}`}>
          <div className="mb-5">
            {/* Un seul <h1> dans le HTML (celui de la version mobile) : la
                version ordinateur garde un titre de niveau 1 pour les lecteurs
                d'écran (l'autre est masqué), sans dupliquer la balise. */}
            <div role="heading" aria-level={1} className="text-2xl font-bold text-charcoal-800">{pageTitle}</div>
            {!isLoading && (
              <span className="text-sm text-charcoal-400 mt-0.5 block">
                {t("resultCount", { count: listings.length })}
              </span>
            )}
          </div>
          {listGrid("grid-cols-2")}
        </div>

        {/* Right: 45% normal / full width when expanded, with floating padding */}
        <div
          className={`${isExpanded ? "flex-1 p-[50px]" : "flex-[45] pt-[50px] pr-[50px] pb-[50px]"} shrink-0 sticky top-[80px] self-start`}
          style={{ height: "calc(100vh - 80px)" }}
        >
          {isDesktop && mapFrame("100%", isExpanded)}
        </div>
      </div>

      {/* ── MOBILE: liste + bouton flottant + carte plein écran ── */}
      <div className="lg:hidden">
        <div className="px-4 pt-5 pb-28">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-charcoal-800">{pageTitle}</h1>
            {!isLoading && listings.length > 0 && (
              <span className="text-sm text-charcoal-400 mt-0.5 block">
                {t("resultCount", { count: listings.length })}
              </span>
            )}
          </div>
          {listGrid("grid-cols-1 sm:grid-cols-2")}
        </div>

        {/* Bouton flottant "Voir la carte" — masqué quand le footer entre dans le viewport */}
        {!showMobileMap && !footerVisible && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setShowMobileMap(true)}
              className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-3 rounded-full"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.20)" }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
              </svg>
              {t("showMap")}
            </button>
          </div>
        )}

        {/* Carte plein écran */}
        {showMobileMap && (
          <div className="fixed inset-0 z-50" style={{ height: "100dvh" }}>
            <ChaletsMap
              listings={listings}
              hoveredId={hoveredId}
              onHoverChange={setHoveredId}
              onBoundsChange={handleBoundsChange}
              destination={{ city: filters.city, region: filters.region }}
              isExpanded={false}
              onToggleExpand={() => {}}
            />
            {/* Au-dessus des mentions Google et de l'échelle (bas de carte) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-10"
              style={{ bottom: "calc(40px + env(safe-area-inset-bottom))" }}
            >
              <button
                onClick={() => setShowMobileMap(false)}
                className="flex items-center gap-2 bg-white text-charcoal-800 font-semibold text-sm px-5 py-3 rounded-full border border-[#ebebeb]"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.16)" }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
                {t("showList")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
