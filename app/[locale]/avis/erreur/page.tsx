import Link from "next/link";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { localePath } from "@/lib/localePath";

export const metadata = { title: "Lien invalide" };

export default async function ReviewErrorPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <section className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-charcoal-800 mb-3">
            {isEn ? "This link is invalid or has expired" : "Ce lien n'est plus valide"}
          </h1>
          <p className="text-charcoal-500 mb-8">
            {isEn
              ? "The review link you followed no longer works — it may have already been used or expired."
              : "Le lien d'avis que vous avez suivi ne fonctionne plus — il a peut-être déjà été utilisé ou a expiré."}
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
