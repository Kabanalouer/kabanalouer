import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { adminSupabase } from "@/lib/sendMessage";
import { getReviewRequestByToken } from "@/lib/reviewToken";
import { localePath } from "@/lib/localePath";

export const metadata = { title: "Merci" };

export default async function ReserveConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const isEn = locale === "en";

  const lookup = await getReviewRequestByToken(adminSupabase(), token);
  if (!lookup.ok) redirect(localePath("/avis/erreur", locale));

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <section className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-800 mb-3">
            {isEn ? "Noted — thank you!" : "Merci, c'est noté !"}
          </h1>
          <p className="text-charcoal-500">
            {isEn
              ? "We'll send you a quick email 24 hours after your stay to ask how it went."
              : "On vous enverra un courriel 24 heures après votre séjour pour savoir comment ça s'est passé."}
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
