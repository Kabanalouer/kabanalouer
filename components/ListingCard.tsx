"use client";

import Image from "next/image";
import Link from "next/link";

export interface Listing {
  id: string;
  title: string;
  region: string;
  price: number;
  rating: number;
  reviewCount: number;
  capacity: number;
  bedrooms: number;
  photo: string;
  isNew?: boolean;
  tags: string[];
}

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/chalets/${listing.id}`}>
      <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200 group cursor-pointer h-full">
        {/* Photo */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={listing.photo}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {listing.isNew && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              Nouveau
            </span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); }}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
            aria-label="Ajouter aux favoris"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
            {listing.region}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">
            {listing.title}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-4 h-4 text-yellow-400 fill-current shrink-0" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">{listing.rating}</span>
            <span className="text-sm text-gray-400">({listing.reviewCount} avis)</span>
          </div>

          {/* Capacity */}
          <div className="text-sm text-gray-500 mb-3">
            {listing.capacity} personnes · {listing.bedrooms} chambre{listing.bedrooms > 1 ? "s" : ""}
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
              <span className="text-lg font-bold text-gray-900">{listing.price}$</span>
              <span className="text-sm text-gray-400"> / nuit</span>
            </div>
            <span className="text-xs text-primary font-medium">Contact direct →</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
