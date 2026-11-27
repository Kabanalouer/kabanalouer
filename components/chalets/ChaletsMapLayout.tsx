"use client";

import ListYourCabinPromo from "@/components/ListYourCabinPromo";
import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { getRegionByDbValue } from "@/lib/regions";
import ListingCard, { type Listing } from "@/components/ListingCard";
import type { MapBounds } from "./ChaletsMap";
import ChaletsSearchSubBar from "./ChaletsSearchSubBar";
import QuickFilters, { type SearchFiltersState } from "./QuickFilters";
import ResultsPagination from "./ResultsPagination";
import OwnersSlimBanner from "./OwnersSlimBanner";
import { localePath } from "@/lib/localePath";
import { useTranslations, useLocale } from "next-intl";
import { useMediaQuery } from "@/components/search/useMediaQuery";

export interface ListingForMap extends Listing {
  lat: number | null;
  lng: number | null;
  // Nom du site de chalets : titre du repère groupé sur la carte
  siteName?: string | null;
}

const ChaletsMap = dynamic(() => import("./ChaletsMap"), { ssr: false });

interface Props {
  // Page de résultats affichée dans la liste (24 fiches complètes)
  initialListings: ListingForMap[];
  // Toutes les fiches de la recherche, en version légère, pour les épingles de la carte
  initialPins: ListingForMap[];
  initialTotal: number;
  initialPage: number;
  initialPageCount: number;
  currentUserId: string | null;
  filters: SearchFiltersState;
}

const MAP_BUTTON =
  "flex items-center gap-2 bg-[var(--fg-1)] text-white font-bold text-sm px-[22px] py-3.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.3)]";

function MapIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0z" />
    </svg>
  );
}

export default function ChaletsMapLayout({ initialListings, initialPins, initialTotal, initialPage, initialPageCount, currentUserId, filters }: Props) {
  const t = useTranslations("chaletsMap");
  const locale = useLocale();
  const regionLabel = filters.region && locale === "en" ? getRegionByDbValue(filters.region)?.nameEn ?? filters.region : filters.region;
  const destination = filters.city || regionLabel || null;
  const pageTitle = destination ? t("titleDestination", { destination }) : t("titleAll");
  const [listings, setListings] = useState<ListingForMap[]>(initialListings);
  const [pins, setPins] = useState<ListingForMap[]>(initialPins);
  const [total, setTotal] = useState(initialTotal);
  // Dernière page chargée (les pages ajoutées par « Afficher plus » s'empilent sous les précédentes)
  const [page, setPage] = useState(initialPage);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  // La carte de droite (split view) n'est montée qu'à partir de lg : sur
  // téléphone et tablette, elle chargerait Google Maps (~240 Ko) pour rien en
  // vue liste. Faux au rendu serveur et à l'hydratation.
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

  // Numéro de la dernière recherche lancée : une réponse plus lente d'un ancien déplacement ne doit jamais
  // écraser la liste d'un déplacement plus récent.
  const lastRequest = useRef(0);

  // Dernière zone de la carte : un changement de page garde la zone que l'utilisateur regarde.
  const lastBounds = useRef<MapBounds | null>(null);

  // Charge une page de résultats pour la zone donnée (toute la recherche si aucune zone). Les épingles ne sont
  // redemandées que quand la zone change : tourner les pages ne change pas ce que la carte montre.
  // append : la page s'ajoute sous les résultats actuels (« Afficher plus ») au lieu de les remplacer.
  const loadResults = useCallback(async (bounds: MapBounds | null, nextPage: number, withPins: boolean, append = false) => {
    const requestId = ++lastRequest.current;
    if (append) setLoadingMore(true);
    else setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(bounds && {
          minLat: bounds.minLat.toString(),
          maxLat: bounds.maxLat.toString(),
          minLng: bounds.minLng.toString(),
          maxLng: bounds.maxLng.toString(),
        }),
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
        page: String(nextPage),
        ...(!withPins && { pins: "0" }),
        locale,
      });
      const res = await fetch(`/api/listings/geo?${params}`);
      if (res.ok) {
        const next = (await res.json()) as { listings: ListingForMap[]; pins: ListingForMap[]; total: number; page: number; pageCount: number };
        if (requestId !== lastRequest.current) return;
        setListings((prev) => {
          if (!append) return next.listings;
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...next.listings.filter((l) => !seen.has(l.id))];
        });
        if (withPins) setPins(next.pins);
        setTotal(next.total);
        setPage(next.page);
        setPageCount(next.pageCount);
        // L'adresse suit la page (partage, rechargement) sans ajouter d'entrée à l'historique.
        const url = new URL(window.location.href);
        if (next.page > 1) url.searchParams.set("page", String(next.page));
        else url.searchParams.delete("page");
        window.history.replaceState(window.history.state, "", url);
      }
    } finally {
      if (requestId === lastRequest.current) {
        setIsLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filters, locale]);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    lastBounds.current = bounds;
    void loadResults(bounds, 1, true);
  }, [loadResults]);

  const goToPage = useCallback((nextPage: number) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    void loadResults(lastBounds.current, nextPage, false);
  }, [loadResults]);

  const loadMore = useCallback(() => {
    void loadResults(lastBounds.current, page + 1, false, true);
  }, [loadResults, page]);

  // Adresse réelle d'une page (?page=N) avec tous les filtres actuels, pour les liens de la pagination
  const hrefForPage = useCallback((n: number) => {
    const p = new URLSearchParams();
    (Object.keys(filters) as (keyof SearchFiltersState)[]).forEach((k) => {
      const v = filters[k];
      if (v) p.set(k, v);
    });
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return localePath(`/chalets${qs ? `?${qs}` : ""}`, locale);
  }, [filters, locale]);

  const EmptyState = () => (
    <div className="md:col-span-2 py-24 text-center">
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
      <div className="aspect-[4/3] rounded-[var(--radius-lg)] bg-charcoal-100 mb-3" />
      <div className="h-4 bg-charcoal-100 rounded w-4/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-3/5 mb-2" />
      <div className="h-3 bg-charcoal-100 rounded w-2/5" />
    </div>
  );

  const mapFrame = (height: string) => (
    <div
      className="rounded-2xl overflow-hidden border border-[#e8e8e8] w-full"
      style={{ height, boxShadow: "0 2px 16px rgba(0,0,0,0.10)" }}
    >
      <ChaletsMap
        listings={pins}
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
      {/* Barre de recherche compacte (sticky sous la navbar) : téléphone et tablette, avec le bouton Filtres rond */}
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

      <div className="flex gap-5 items-start">
        {/* Liste : toute la largeur sous 1024 px, 55 % à côté de la carte (cachée quand la carte est agrandie) */}
        <div className={`min-w-0 flex-1 lg:flex-[55] px-4 lg:px-5 pt-5 pb-28 lg:pb-10 ${isExpanded ? "hidden" : ""}`}>
          <header className="mb-5">
            <h1 className="text-[26px] sm:text-[length:min(var(--fs-display),40px)] font-extrabold leading-none tracking-[-0.04em] text-[var(--fg-1)]">
              {pageTitle}
            </h1>
            {total > 0 && (
              <p className="mt-2.5 text-[13px] sm:text-[15px] text-[var(--fg-2)]">
                <strong className="font-bold text-[var(--fg-1)]">{t("countChalets", { count: total })}</strong>
                <span className="hidden sm:inline">{" · "}{t("countTail")}</span>
              </p>
            )}
          </header>

          <div className="mb-6">
            <QuickFilters filters={filters} />
          </div>

          {/* Titre invisible : garde l'ordre des titres (h1 → h2 → h3 des cartes) pour les lecteurs d'écran */}
          <h2 className="sr-only">{locale === "en" ? "Results" : "Résultats"}</h2>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8 transition-opacity ${isLoading && listings.length > 0 ? "opacity-60" : ""}`}>
            {listings.length === 0 ? (
              isLoading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : <EmptyState />
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

          <ResultsPagination
            page={page}
            pageCount={pageCount}
            shown={listings.length}
            total={total}
            hrefFor={hrefForPage}
            onPageChange={goToPage}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />

          <OwnersSlimBanner />
        </div>

        {/* Carte : 45 % (plein écran quand agrandie), collée sous la navbar. Ordinateur seulement. */}
        <div
          className={`hidden lg:block ${isExpanded ? "flex-1 p-[50px]" : "flex-[45] pt-[50px] pr-[50px] pb-[50px]"} shrink-0 sticky top-[80px] self-start`}
          style={{ height: "calc(100vh - 80px)" }}
        >
          {isDesktop && mapFrame("100%")}
        </div>
      </div>

      {/* ── Téléphone et tablette : bouton flottant Carte / Liste, carte plein écran ── */}
      <div className="lg:hidden">
        {/* Masqué quand le footer entre dans le viewport */}
        {!showMobileMap && !footerVisible && (
          <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={() => setShowMobileMap(true)} className={MAP_BUTTON}>
              <MapIcon />
              {t("mapShort")}
            </button>
          </div>
        )}

        {showMobileMap && (
          <div className="fixed inset-0 z-50" style={{ height: "100dvh" }}>
            <ChaletsMap
              listings={pins}
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
              <button type="button" onClick={() => setShowMobileMap(false)} className={MAP_BUTTON}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
                {t("listShort")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
