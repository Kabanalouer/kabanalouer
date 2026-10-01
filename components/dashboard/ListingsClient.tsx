"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { firstPhotoUrl } from "@/lib/photo";
import { getScoreLevel } from "@/lib/listingScore";
import { buildListingPath } from "@/lib/listingUrl";
import { formatDecimal } from "@/lib/formatNumber";
import { localePath } from "@/lib/localePath";
import { getRegionByDbValue } from "@/lib/regions";

type Listing = {
  id: string;
  title: string | null;
  title_en?: string | null;
  region: string | null;
  city?: string | null;
  listing_number?: number | null;
  custom_slug?: string | null;
  is_published: boolean | null;
  price_low: number | null;
  photos: unknown;
};

type ReviewInfo = { count: number; avg: number };

interface Props {
  listings: Listing[];
  reviews: Record<string, ReviewInfo>;
  scores: Record<string, number>;
  translationPending?: Record<string, boolean>;
}

export default function ListingsClient({ listings, reviews, scores, translationPending = {} }: Props) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const isEn = locale === "en";

  // Brouillons d'abord (ordre d'origine conservé dans chaque groupe) : ce qui
  // reste à publier ne doit pas se perdre dans la liste.
  const sorted = [...listings].sort((a, b) => Number(!!a.is_published) - Number(!!b.is_published));

  return (
    <div className="space-y-3">
      {sorted.map((listing) => {
          const isDraft = !listing.is_published;
          const rev = reviews[listing.id];
          const photo = firstPhotoUrl(listing.photos);
          const title = (isEn && listing.title_en?.trim()) || listing.title || t("untitled");
          const regionLabel = isEn && listing.region
            ? (getRegionByDbValue(listing.region)?.nameEn ?? listing.region)
            : listing.region;
          const score = scores[listing.id] ?? 0;
          const editHref = localePath(`/dashboard/listings/${listing.id}/edit`, locale);
          const publicHref = listing.is_published
            ? buildListingPath(
                { region: listing.region, city: listing.city ?? null, listing_number: listing.listing_number ?? null, custom_slug: listing.custom_slug ?? null },
                locale === "en" ? "en" : "fr"
              ) ?? localePath(`/chalets/${listing.id}`, locale)
            : null;

          // Toute la carte mène à la modification (lien étiré) ; « Voir la
          // fiche » reste un lien séparé, posé au-dessus.
          return (
            <div
              key={listing.id}
              className={`relative rounded-2xl border p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 transition-colors ${
                isDraft
                  ? "bg-warning-50/60 border-warning-200 hover:border-warning-500"
                  : "bg-white border-[#ebebeb] hover:border-charcoal-200"
              }`}
            >
              {/* Thumbnail */}
              <div className="w-[72px] h-[72px] rounded-xl bg-charcoal-100 overflow-hidden shrink-0">
                {photo ? (
                  <Image src={photo} alt={title} width={72} height={72} className="w-full h-full object-cover" />
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
                <Link
                  href={editHref}
                  className="font-semibold text-charcoal-800 leading-snug line-clamp-2 after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
                  aria-label={`${t("editLink")} — ${title}`}
                >
                  {title}
                </Link>
                {regionLabel && <p className="text-sm text-charcoal-400 mt-0.5 truncate">{regionLabel}</p>}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                  {/* Même pastille que l'en-tête de la page d'édition */}
                  {isDraft ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-0.5 font-semibold text-warning-800">
                      <span className="w-2 h-2 rounded-full bg-warning-500" aria-hidden="true" />
                      {t("draftNotLive")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2.5 py-0.5 font-semibold text-success-700">
                      <span className="w-2 h-2 rounded-full bg-success-500" aria-hidden="true" />
                      {t("live")}
                    </span>
                  )}
                  <span className="font-semibold" style={{ color: getScoreLevel(score).color }}>{t("score", { score })}</span>
                  {rev && (
                    <span className="text-charcoal-500 flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-star fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {formatDecimal(rev.avg, locale)} ({rev.count})
                    </span>
                  )}
                  {translationPending[listing.id] && (
                    <span className="text-warning-700">{t("translationPending")}</span>
                  )}
                </div>
              </div>

              {/* Brouillon : bouton explicite vers la section Publier (sous le titre sur mobile) */}
              {isDraft && (
                <Link
                  href={`${editHref}?section=publier`}
                  className="relative z-10 order-last sm:order-none w-full sm:w-auto shrink-0 inline-flex items-center justify-center min-h-11 px-4 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  {t("finishAndPublish")}
                </Link>
              )}

              {/* Actions : voir la fiche (lien séparé, au-dessus du lien étiré) + chevron */}
              <div className={`items-center gap-1 shrink-0 ${isDraft ? "hidden" : "flex"}`}>
                {publicHref && (
                  <Link
                    href={publicHref}
                    target="_blank"
                    aria-label={t("viewListing")}
                    title={t("viewListing")}
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full text-charcoal-400 hover:text-primary hover:bg-charcoal-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}
                <svg className="w-5 h-5 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          );
      })}
    </div>
  );
}
