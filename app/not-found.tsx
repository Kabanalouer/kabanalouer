import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";

export const metadata = { title: "Page introuvable" };

export default async function NotFound() {
  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <section className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <p className="text-sm font-semibold text-primary mb-3">404</p>
          <h1 className="text-3xl font-bold text-charcoal-800 mb-3">
            {isEn ? "Page not found" : "Page introuvable"}
          </h1>
          <p className="text-charcoal-500 mb-8">
            {isEn
              ? "The page you're looking for doesn't exist or may have been moved."
              : "La page que tu cherches n'existe pas ou a été déplacée."}
          </p>
          <Link
            href={localePath("/", locale)}
            className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary-dark transition-colors"
          >
            {isEn ? "Back to home" : "Retour à l'accueil"}
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
