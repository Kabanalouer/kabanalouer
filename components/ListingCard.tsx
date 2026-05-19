"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import FavoriteButton from "@/components/chalets/FavoriteButton";

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
  tags: string[];
}

export default function ListingCard({
  listing,
  currentUserId,
}: {
  listing: Listing;
  currentUserId?: string | null;
}) {
  const photos = listing.photos.length > 0 ? listing.photos : ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80"];
  const [idx, setIdx] = useState(0);

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
    <Link href={`/chalets/${listing.id}`}>
      <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200 group cursor-pointer h-full">

        {/* Photo carousel */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {listing.photos.length > 0 ? (
            <Image
              src={photos[idx]}
              alt={`${listing.title} – photo ${idx + 1}`}
              fill
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
          )}

          {/* Prev arrow */}
          {photos.length > 1 && idx > 0 && (
            <button
              onClick={prev}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-700 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {photos.length > 1 && idx < photos.length - 1 && (
            <button
              onClick={next}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-700 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          {/* Dot indicators */}
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none z-10">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          )}

          {/* Badges */}
          {listing.isNew && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full z-10">
              Nouveau
            </span>
          )}

          {/* Favorite button */}
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton
              listingId={listing.id}
              initialIsFavorite={listing.isFavorite ?? false}
              currentUserId={currentUserId ?? null}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
            {location}
          </div>

          <h3 className="font-semibold text-gray-900 mb-2 text-sm truncate">
            {listing.title}
          </h3>

          {/* Capacity + beds */}
          <div className="text-sm text-gray-500 mb-3">
            {listing.capacity} personne{listing.capacity > 1 ? "s" : ""}
            {" · "}
            {listing.bedrooms} chambre{listing.bedrooms > 1 ? "s" : ""}
            {listing.beds != null && listing.beds > 0 && (
              <> · {listing.beds} lit{listing.beds > 1 ? "s" : ""}</>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {listing.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              <p className="text-[10px] text-gray-400 leading-none mb-0.5">À partir de</p>
              {listing.priceOnRequest ? (
                <span className="text-base font-semibold text-gray-900">Sur demande</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-gray-900">{listing.price} $</span>
                  <span className="text-sm text-gray-400"> / nuit</span>
                </>
              )}
            </div>
            <span className="text-xs text-primary font-medium">Contact direct →</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
