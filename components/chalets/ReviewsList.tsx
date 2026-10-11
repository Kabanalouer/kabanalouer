"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import TranslatedText from "@/components/TranslatedText";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  comment_lang?: string | null;
  comment_translated?: string | null;
  host_reply: string | null;
  host_reply_lang?: string | null;
  host_reply_translated?: string | null;
  created_at: string;
  review_type: "echange" | "sejour";
  author: { name: string | null; avatar_url: string | null } | null;
};

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const [filter, setFilter] = useState<"all" | "echange" | "sejour">("all");
  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.review_type === filter);
  const hasBothTypes = reviews.some((r) => r.review_type === "echange") && reviews.some((r) => r.review_type === "sejour");

  return (
    <div>
      {/* Filtres discrets, seulement s'il y a des avis des deux types */}
      {hasBothTypes && (
        <div className="flex gap-5 mb-5 border-b border-charcoal-100" role="tablist">
          {(["all", "echange", "sejour"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`-mb-px py-2.5 text-sm border-b-2 transition-colors ${
                filter === f
                  ? "border-charcoal-800 text-charcoal-800 font-semibold"
                  : "border-transparent text-charcoal-400 hover:text-charcoal-800"
              }`}
            >
              {f === "all" ? t("reviewsFilterAll") : f === "echange" ? t("reviewsFilterExchange") : t("reviewsFilterStay")}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-charcoal-400 text-base">{t("reviewsFilterEmpty")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((review) => {
            const authorName = review.author?.name ?? t("reviewsDefaultAuthor");
            const authorFirst = authorName.split(" ")[0];
            const initial = authorFirst[0]?.toUpperCase() ?? "?";
            const reviewDate = new Date(review.created_at).toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", {
              month: "long", year: "numeric",
            });
            return (
              <div key={review.id} className="bg-white rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full shrink-0 bg-charcoal-100 overflow-hidden flex items-center justify-center">
                    {review.author?.avatar_url ? (
                      <img src={review.author.avatar_url} alt={authorFirst} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-charcoal-600 font-bold text-sm">{initial}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-charcoal-800 leading-tight">{authorFirst}</p>
                      <span className="text-xs font-medium text-charcoal-600 bg-charcoal-50 rounded-full px-2 py-0.5">
                        {review.review_type === "echange" ? t("reviewsTypeExchange") : t("reviewsTypeStay")}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal-400 mb-1">{reviewDate}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className={`w-3.5 h-3.5 fill-current ${i <= review.rating ? "text-star" : "text-[#ebebeb]"}`} viewBox="0 0 20 20">
                          <path d={STAR_PATH} />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <TranslatedText
                    original={review.comment}
                    lang={review.comment_lang}
                    translated={review.comment_translated}
                    className="text-base text-charcoal-600 leading-relaxed"
                  />
                )}
                {review.host_reply && (
                  <div className="bg-charcoal-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-charcoal-600 mb-1">{t("hostReplyLabel")}</p>
                    <TranslatedText
                      original={review.host_reply}
                      lang={review.host_reply_lang}
                      translated={review.host_reply_translated}
                      className="text-base text-charcoal-600 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
