import Link from "next/link";

// Bas des pages thématiques (équipement, chiens acceptés, mobilité réduite) :
// après la FAQ, renvoie vers la recherche déjà filtrée pour vérifier les dates.
export default function LandingSearchCta({ href, isEn }: { href: string; isEn: boolean }) {
  return (
    <div className="mt-12 rounded-2xl border border-[#ebebeb] bg-primary-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
      <div>
        <p className="text-heading-3 font-bold text-charcoal-900 mb-1">
          {isEn ? "Ready to book?" : "Prêt à réserver ?"}
        </p>
        <p className="text-base text-charcoal-600">
          {isEn
            ? "Choose your dates to check their availability."
            : "Choisissez vos dates pour vérifier leurs disponibilités."}
        </p>
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex justify-center bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {isEn ? "Check availability →" : "Voir les disponibilités →"}
      </Link>
    </div>
  );
}
