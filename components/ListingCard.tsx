"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import FavoriteButton from "@/components/chalets/FavoriteButton";
import { formatPromoLines, isLastminuteVisible, type PromoDisplay } from "@/lib/promoLabel";
import { useTranslations } from "next-intl";

export interface Listing {
  id: string;
  title: string;
  region: string;
  city?: string | null;
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
}: {
  listing: Listing;
  currentUserId?: string | null;
}) {
  const t = useTranslations("listingCard");
  const photos =
    listing.photos.length > 0
      ? listing.photos
      : ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"];
  const [idx, setIdx] = useState(0);
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
    return `/chalets/${listing.id}${s ? `?${s}` : ""}`;
  })();

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => Math.max(0, i - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => Math.min(photos.length - 1, i + 1));
  };

  const location = listing.city?.trim() || listing.region;

  return (
    <Link href={listingHref} className="group block">
      {/* ── Photo ── */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-3 transition-shadow duration-200 group-hover:shadow-md">
        {listing.photos.length > 0 ? (
          <Image
            src={photos[idx]}
            alt={`${listing.title} — photo ${idx + 1}`}
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg
              className="w-12 h-12 text-gray-300"
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
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-[30px] h-[30px] flex items-center justify-center shadow-sm border border-gray-100 text-charcoal-800 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        {/* Next arrow */}
        {photos.length > 1 && idx < photos.length - 1 && (
          <button
            onClick={next}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full w-[30px] h-[30px] flex items-center justify-center shadow-sm border border-gray-100 text-charcoal-800 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1 pointer-events-none z-10">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                  i === idx ? "bg-white scale-110" : "bg-white/55"
                }`}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {listing.isFeatured && (
            <span className="bg-[#636e40] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
              {t("featured")}
            </span>
          )}
          {listing.hasPromo && listing.promoData && isLastminuteVisible(listing.promoData, checkin) && (
            <span className="bg-[#f04e45] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
              {formatPromoLines(listing.promoData).line1}
            </span>
          )}
          {listing.isNew && (
            <span className="bg-white text-charcoal-800 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
              {t("isNew")}
            </span>
          )}
        </div>

        {/* Favorite */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <FavoriteButton
            listingId={listing.id}
            initialIsFavorite={listing.isFavorite ?? false}
            currentUserId={currentUserId ?? null}
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div>
        {/* Title */}
        <h3 className="font-semibold text-[15px] text-charcoal-800 leading-snug truncate mb-1">
          {listing.title}
        </h3>

        {/* Meta — location · capacity · bedrooms · beds */}
        <p className="text-[13px] text-charcoal-400 mb-2">
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
          <p className="text-[14px] text-charcoal-800 font-semibold">{t("priceOnRequest")}</p>
        ) : listing.price > 0 ? (
          <p className="text-[14px] font-semibold text-charcoal-800">
            {listing.price} $ <span className="text-charcoal-400">{t("perNight")}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
