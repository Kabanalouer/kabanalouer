"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import Navbar from "@/components/Navbar";
import { localePath } from "@/lib/localePath";
import { reportClientError } from "@/lib/reportClientError";

// Page affichée quand une page plante : message clair au lieu d'un écran
// blanc, et l'erreur est envoyée dans Admin → Erreurs.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const isEn = locale === "en";

  useEffect(() => {
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <section className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-charcoal-800 mb-3">
            {isEn ? "Something went wrong" : "Oups, un problème est survenu"}
          </h1>
          <p className="text-charcoal-500 mb-8">
            {isEn
              ? "The page could not be displayed. We've been notified and will look into it."
              : "La page n'a pas pu s'afficher. On a été prévenus et on s'en occupe."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={reset}
              className="bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary-dark transition-colors"
            >
              {isEn ? "Try again" : "Réessayer"}
            </button>
            <Link
              href={localePath("/", locale)}
              className="bg-white text-primary font-semibold px-6 py-3 rounded-full border border-primary hover:bg-[#f5f6ec] transition-colors"
            >
              {isEn ? "Back to home" : "Retour à l'accueil"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
