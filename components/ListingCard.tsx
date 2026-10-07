"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FavoriteButton from "@/components/chalets/FavoriteButton";
import { formatPromoLines, isLastminuteVisible, type PromoDisplay } from "@/lib/promoLabel";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { getRegionByDbValue } from "@/lib/regions";
import { formatPrice } from "@/lib/formatPrice";

export interface Listing {
  id: string;
  title: string;
  region: string;
  city?: string | null;
  listing_number?: number | null;
  custom_slug?: string | null;
  price: number;
  priceOnRequest?: boolean;
  capacity: number;
  bedrooms: number;
  beds?: number | null;
  photos: string[];
  isFavorite?: boolean;
  isNew?: boolean;
  hasPromo?: boolean;
  promoData?: PromoDisplay | null;
  isFeatured?: boolean;
  tags: string[];
}

export default function ListingCard({
  listing,
  currentUserId,
  priority = false,
}: {
  listing: Listing;
  currentUserId?: string | null;
  // Cartes au-dessus de la ligne de flottaison : première photo chargée en priorité.
  priority?: boolean;
}) {
  const t = useTranslations("listingCard");
  const locale = useLocale();
  const photos =
    listing.photos.length > 0
      ? listing.photos
      : ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"];
  const [idx, setIdx] = useState(0);
  // Plus grand index atteint : les photos ne sont montées qu'au fil du balayage.
  const [maxSeen, setMaxSeen] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const checkin = searchParams.get("checkin");
  const checkout = searchParams.get("checkout");
  const capacity = searchParams.get("capacity");
  const listingHref = (() => {
    const qs = new URLSearchParams();
    if (checkin) qs.set("checkin", checkin);
    if (checkout) qs.set("checkout", checkout);
    if (capacity) qs.set("capacity", capacity);
    const s = qs.toString();
    const path = buildListingPath(
      { region: listing.region, city: listing.city ?? null, listing_number: listing.listing_number ?? null, custom_slug: listing.custom_slug ?? null },
      locale === "en" ? "en" : "fr"
    ) ?? localePath(`/chalets/${listing.id}`, locale);
    return `${path}${s ? `?${s}` : ""}`;
  })();

  // Flèches (bureau) : font défiler la piste ; l'index suit via onScroll.
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(photos.length - 1, i));
    if (target > maxSeen) setMaxSeen(target);
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(idx - 1);
  };

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo(idx + 1);
  };

  // Balayage tactile (scroll-snap natif) : un geste de défilement annule le
  // clic, donc balayer ne déclenche pas la navigation vers la fiche.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.max(0, Math.min(photos.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== idx) setIdx(i);
    if (i > maxSeen) setMaxSeen(i);
  };

  const regionLabel = locale === "en" ? getRegionByDbValue(listing.region)?.nameEn ?? listing.region : listing.region;
  const location = listing.city?.trim() || regionLabel;

  return (
    <Link href={listingHref} className="group block">
      {/* ── Photo ── */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-charcoal-100 mb-3 transition-shadow duration-200 group-hover:shadow-md">
        {listing.photos.length > 0 ? (
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((src, i) => (
              <div key={i} className="relative w-full h-full shrink-0 snap-center snap-always">
                {i <= maxSeen + 1 && (
                  <Image
                    src={src}
                    alt={`${listing.title} — photo ${i + 1}`}
                    fill
                    {...(priority && i === 0 ? { priority: true } : { loading: "lazy" as const })}
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    draggable={false}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-charcoal-100">
            <svg
              className="w-12 h-12 text-charcoal-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </div>
        )}

        {/* Prev arrow */}
        {photos.length > 1 && idx > 0 && (
          <button
            onClick={prev}
            aria-label={t("prevPhoto")}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-charcoal-100 text-charcoal-800 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10 [@media(hover:none)]:hidden"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        {/* Next arrow */}
        {photos.length > 1 && idx < photos.length - 1 && (
          <button
            onClick={next}
            aria-label={t("nextPhoto")}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-charcoal-100 text-charcoal-800 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10 [@media(hover:none)]:hidden"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Dot indicators — fenêtre glissante de 5 points max (style Airbnb) */}
        {photos.length > 1 && (() => {
          const SLOT = 7;
          const GAP = 5;
          const VISIBLE = Math.min(photos.length, 5);
          const start = Math.max(0, Math.min(idx - 2, photos.length - VISIBLE));
          const end = start + VISIBLE - 1;
          return (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10"
              style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,.3))" }}
            >
              <div className="overflow-hidden" style={{ width: VISIBLE * SLOT + (VISIBLE - 1) * GAP, height: SLOT }}>
                <div
                  className="flex h-full transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ gap: GAP, transform: `translateX(-${start * (SLOT + GAP)}px)` }}
                >
                  {photos.map((_, i) => {
                    // Actif 7px/100 %, voisins 6px/60 %, bords de fenêtre (s'il reste des photos au-delà) 4,5px/40 %
                    const atEdge = (i === start && start > 0) || (i === end && end < photos.length - 1);
                    const outside = i < start || i > end;
                    const size = i === idx ? 7 : outside ? 4 : atEdge ? 4.5 : 6;
                    const opacity = i === idx ? 1 : outside ? 0 : atEdge ? 0.4 : 0.6;
                    return (
                      <span key={i} className="flex items-center justify-center shrink-0" style={{ width: SLOT, height: SLOT }}>
                        <span
                          className="rounded-full bg-white transition-[width,height,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                          style={{ width: size, height: size, opacity }}
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {listing.isFeatured && (
            <span className="bg-[#636e40] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {t("featured")}
            </span>
          )}
          {listing.hasPromo && listing.promoData && isLastminuteVisible(listing.promoData, checkin) && (
            <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {formatPromoLines(listing.promoData, locale).line1}
            </span>
          )}
          {listing.isNew && (
            <span className="bg-white text-charcoal-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
              {t("isNew")}
            </span>
          )}
        </div>

        {/* Favorite */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {/* Pseudo-élément : zone de toucher 44x44 autour du cœur visuel de 32 px */}
          <FavoriteButton
            listingId={listing.id}
            initialIsFavorite={listing.isFavorite ?? false}
            currentUserId={currentUserId ?? null}
            className="relative block before:absolute before:-inset-1.5 before:rounded-full"
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div>
        {/* Title */}
        <h3 className="font-semibold text-base text-charcoal-800 leading-snug truncate mb-1">
          {listing.title}
        </h3>

        {/* Meta — location · capacity · bedrooms · beds */}
        <p className="text-sm text-charcoal-400 mb-2">
          {location}
          {" · "}
          {t("travelers", { count: listing.capacity })}
          {" · "}
          {t("bedrooms", { count: listing.bedrooms })}
          {listing.beds != null && (
            <>{" · "}{t("beds", { count: listing.beds })}</>
          )}
        </p>

        {/* Price */}
        {listing.priceOnRequest ? (
          <p className="text-sm text-charcoal-800">{t("priceOnRequest")}</p>
        ) : listing.price > 0 ? (
          <p className="text-sm text-charcoal-800">
            {formatPrice(listing.price, locale)} <span className="text-charcoal-400">{t("perNight")}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
