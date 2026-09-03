"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  host_reply: string | null;
  created_at: string;
  review_type: "echange" | "sejour";
  author: { name: string | null; avatar_url: string | null } | null;
};

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  const t = useTranslations("listing");
  const [filter, setFilter] = useState<"all" | "echange" | "sejour">("all");
  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.review_type === filter);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(["all", "echange", "sejour"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f ? "bg-primary text-white" : "border border-[#ebebeb] text-charcoal-600 hover:border-charcoal-400"
            }`}
          >
            {f === "all" ? t("reviewsFilterAll") : f === "echange" ? t("reviewsFilterExchange") : t("reviewsFilterStay")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-charcoal-400 text-sm">{t("reviewsFilterEmpty")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {filtered.map((review) => {
            const authorName = review.author?.name ?? "Voyageur";
            const authorFirst = authorName.split(" ")[0];
            const initial = authorFirst[0]?.toUpperCase() ?? "V";
            const reviewDate = new Date(review.created_at).toLocaleDateString("fr-CA", {
              month: "long", year: "numeric",
            });
            return (
              <div key={review.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full shrink-0 bg-primary overflow-hidden flex items-center justify-center">
                    {review.author?.avatar_url ? (
                      <img src={review.author.avatar_url} alt={authorFirst} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">{initial}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-charcoal-800 leading-tight">{authorFirst}</p>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {review.review_type === "echange" ? t("reviewsTypeExchange") : t("reviewsTypeStay")}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-400 mb-1">{reviewDate}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className={`w-3 h-3 fill-current ${i <= review.rating ? "text-primary" : "text-[#ebebeb]"}`} viewBox="0 0 20 20">
                          <path d={STAR_PATH} />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-charcoal-500 leading-relaxed">{review.comment}</p>
                )}
                {review.host_reply && (
                  <div className="pl-4 border-l-2 border-[#ebebeb] mt-2">
                    <p className="text-xs font-semibold text-charcoal-600 mb-1">{t("hostReplyLabel")}</p>
                    <p className="text-sm text-charcoal-500 leading-relaxed">{review.host_reply}</p>
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
