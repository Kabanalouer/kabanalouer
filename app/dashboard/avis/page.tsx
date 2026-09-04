import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ReviewReplyForm from "@/components/dashboard/ReviewReplyForm";

export const metadata = { title: "Mes avis" };

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 fill-current ${i <= rating ? "text-primary" : "text-[#ebebeb]"}`} viewBox="0 0 20 20">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export default async function MesAvisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/avis");

  const [t, locale] = await Promise.all([
    getTranslations("reviews"),
    getLocale(),
  ]);

  const formatRelativeDate = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    if (diffDays < 14) return t("weekAgo");
    if (diffDays < 30) return t("weeksAgo", { count: Math.floor(diffDays / 7) });
    if (diffDays < 60) return t("monthAgo");
    if (diffDays < 365) return t("monthsAgo", { count: Math.floor(diffDays / 30) });
    return date.toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", { month: "long", year: "numeric" });
  };

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title")
    .eq("host_id", user.id);

  const listingIds = (listings ?? []).map((l) => l.id);
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l.title as string]));

  type ReviewRow = {
    id: string;
    listing_id: string;
    rating: number;
    comment: string | null;
    host_reply: string | null;
    created_at: string;
    author: { name: string | null; avatar_url: string | null } | null;
  };

  // Jointure PostgREST retirée : "author:author_id(...)" suit la vraie clé
  // étrangère vers public.users, dont la RLS ne permet plus la lecture
  // publique — fetch séparé via la vue public_profiles, fusionné ici.
  const { data: reviewsData } = listingIds.length > 0
    ? await supabase
        .from("reviews")
        .select("id, listing_id, rating, comment, host_reply, created_at, author_id")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; listing_id: string; rating: number; comment: string | null; host_reply: string | null; created_at: string; author_id: string }[] };

  const authorIds = [...new Set((reviewsData ?? []).map((r) => r.author_id))];
  const { data: reviewAuthors } = authorIds.length > 0
    ? await supabase.from("public_profiles").select("id, name, avatar_url").in("id", authorIds)
    : { data: [] as { id: string; name: string | null; avatar_url: string | null }[] };
  const authorById = new Map(
    (reviewAuthors ?? []).map((a) => [a.id, { name: a.name, avatar_url: a.avatar_url }])
  );

  const rawReviews: ReviewRow[] = (reviewsData ?? []).map((r) => ({
    id: r.id,
    listing_id: r.listing_id,
    rating: r.rating,
    comment: r.comment,
    host_reply: r.host_reply,
    created_at: r.created_at,
    author: authorById.get(r.author_id) ?? null,
  }));

  const reviews = [...((rawReviews ?? []) as ReviewRow[])].sort((a, b) => {
    if (!a.host_reply && b.host_reply) return -1;
    if (a.host_reply && !b.host_reply) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const unansweredCount = reviews.filter((r) => !r.host_reply).length;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-charcoal-800">{t("heading")}</h1>
          {unansweredCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {unansweredCount}
            </span>
          )}
        </div>
        {reviews.length > 0 && (
          <p className="text-charcoal-400 text-sm">{t("count", { count: reviews.length })}</p>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-charcoal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h3 className="font-semibold text-charcoal-800 mb-2">{t("emptyTitle")}</h3>
          <p className="text-charcoal-400 text-sm max-w-sm mx-auto">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const author = review.author;
            const authorName = author?.name ?? t("defaultAuthor");
            const authorFirstName = authorName.split(" ")[0];
            const initial = authorFirstName[0]?.toUpperCase() ?? "V";
            const listingTitle = listingMap.get(review.listing_id) ?? "";

            return (
              <div key={review.id} className="bg-white rounded-2xl border border-[#ebebeb] p-5">
                {/* Chalet name */}
                <div className="mb-3">
                  <Link
                    href={`/chalets/${review.listing_id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {listingTitle}
                  </Link>
                </div>

                {/* Author + date + stars */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center">
                    {author?.avatar_url ? (
                      <Image
                        src={author.avatar_url}
                        alt={authorFirstName}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-primary font-bold text-sm">{initial}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-charcoal-800">{authorFirstName}</p>
                      <p className="text-xs text-charcoal-400">{formatRelativeDate(review.created_at)}</p>
                    </div>
                    <Stars rating={review.rating} />
                  </div>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-charcoal-600 leading-relaxed mb-3">
                    {review.comment}
                  </p>
                )}

                {/* Reply */}
                <ReviewReplyForm
                  reviewId={review.id}
                  existingReply={review.host_reply}
                  allowEdit={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
