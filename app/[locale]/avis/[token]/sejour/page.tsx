import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { adminSupabase } from "@/lib/sendMessage";
import { getReviewRequestByToken } from "@/lib/reviewToken";
import { localePath } from "@/lib/localePath";
import SejourReviewClient from "./SejourReviewClient";

const DAY_MS = 24 * 60 * 60 * 1000;

export const metadata = { title: "Avis de séjour" };

export default async function SejourReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";
  const admin = adminSupabase();

  const lookup = await getReviewRequestByToken(admin, token);
  if (!lookup.ok) redirect(localePath("/avis/erreur", locale));
  const { reviewRequest } = lookup;

  const { data: listing } = await admin
    .from("listings")
    .select("title")
    .eq("id", reviewRequest.listing_id)
    .single();
  const listingTitle = (listing?.title as string | undefined) ?? (isEn ? "your listing" : "ce chalet");

  const checkOutPassed = reviewRequest.check_out
    ? Date.now() - new Date(`${reviewRequest.check_out}T00:00:00Z`).getTime() >= DAY_MS
    : true;
  const eligible =
    checkOutPassed &&
    (reviewRequest.status === "awaiting_stay_review" || reviewRequest.status === "stay_prompted");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <section className="flex-1 py-16 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-charcoal-800 text-center mb-1">
            {isEn ? "How was your stay?" : "Comment s'est passé votre séjour ?"}
          </h1>
          <p className="text-sm text-charcoal-400 text-center mb-6">{listingTitle}</p>

          {reviewRequest.status === "completed" ? (
            <div className="border border-[#ebebeb] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-charcoal-800 text-sm mb-1">
                {isEn ? "You've already submitted this review" : "Vous avez déjà soumis cet avis"}
              </p>
              <p className="text-xs text-charcoal-400">
                {isEn ? "Thanks again for sharing your experience." : "Merci encore d'avoir partagé votre expérience."}
              </p>
            </div>
          ) : !eligible ? (
            <div className="border border-[#ebebeb] rounded-2xl p-6 text-center">
              <p className="text-sm text-charcoal-500">
                {isEn
                  ? "This review isn't available yet — we'll email you once your stay is over."
                  : "Cet avis n'est pas encore disponible — on vous écrira une fois votre séjour terminé."}
              </p>
            </div>
          ) : (
            <SejourReviewClient token={token} />
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
