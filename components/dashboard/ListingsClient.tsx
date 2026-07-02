"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { firstPhotoUrl } from "@/lib/photo";
import { getScoreLevel } from "@/lib/listingScore";

type Listing = {
  id: string;
  title: string | null;
  region: string | null;
  is_published: boolean | null;
  price_low: number | null;
  photos: unknown;
};

type ReviewInfo = { count: number; avg: number };

interface Props {
  listings: Listing[];
  reviews: Record<string, ReviewInfo>;
  scores: Record<string, number>;
}

export default function ListingsClient({ listings, reviews, scores }: Props) {
  const t = useTranslations("listings");

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
          const rev = reviews[listing.id];
          const photo = firstPhotoUrl(listing.photos);
          const title = listing.title || t("untitled");

          return (
            <div
              key={listing.id}
              className="bg-white rounded-2xl border border-[#ebebeb] p-4 flex items-center gap-4 hover:border-charcoal-200 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl bg-charcoal-100 overflow-hidden shrink-0">
                {photo ? (
                  <Image src={photo} alt={title} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-charcoal-800 truncate">{title}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{listing.region}</p>
                <div className="flex items-center flex-wrap gap-2 mt-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    listing.is_published ? "bg-green-50 text-green-700" : "bg-charcoal-100 text-charcoal-500"
                  }`}>
                    {listing.is_published ? t("published") : t("draft")}
                  </span>
                  {(() => { const s = scores[listing.id] ?? 0; return (
                    <span className="text-xs font-semibold" style={{ color: getScoreLevel(s).color }}>{t("score", { score: s })}</span>
                  ); })()}
                  {rev && (
                    <span className="text-xs text-charcoal-500 flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {rev.avg.toFixed(1)} ({rev.count})
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {listing.is_published && (
                  <Link
                    href={`/chalets/${listing.id}`}
                    target="_blank"
                    className="text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors hidden sm:block"
                  >
                    {t("viewListing")}
                  </Link>
                )}

                <Link
                  href={`/dashboard/listings/${listing.id}/edit`}
                  className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
                >
                  {t("editLink")}
                </Link>
              </div>
            </div>
          );
      })}
    </div>
  );
}
