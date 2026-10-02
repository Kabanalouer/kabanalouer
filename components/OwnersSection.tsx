import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { LAUNCH_OFFER_END } from "@/lib/subscriptionPricing";

// Section « Pour les propriétaires » de la page d'accueil, juste avant le pied
// de page. Aucun prix d'abonnement ici (choix de Simon, 2026-09-29) ; seulement
// l'offre de lancement depuis le 2026-10-01.
export default async function OwnersSection() {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const deadline = new Date(`${LAUNCH_OFFER_END}T12:00:00`).toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <section className="bg-primary text-white py-24 px-6">
      <div className="max-w-[560px] mx-auto flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="inline-flex items-center rounded-full bg-[#dce7a8] px-4 py-1.5 text-xs font-bold tracking-[0.08em] uppercase text-primary-dark">
            {t("ctaLabel")}
          </p>
          <h2 className="text-[32px] sm:text-[44px] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
            {t("ownersTitleLine1")}
            <br />
            {t("ownersTitleLine2")} <span className="text-[#dce7a8]">{t("ownersTitleAccent")}</span>
          </h2>
          <p className="text-[17px] leading-[1.6] text-primary-50 text-pretty">
            {t("ownersDesc")}
          </p>
          <p className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            {t("ownersDeadline", { date: deadline })}
          </p>
        </div>

        <Link
          href={localePath("/devenir-hote", locale)}
          className="inline-flex items-center bg-white text-primary font-bold text-base px-7 py-4 rounded-full transition-[background-color,color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary-50 hover:text-primary-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
        >
          {t("ctaButton")}
        </Link>
        <p className="-mt-6 text-sm text-primary-100">{t("ownersNoCard")}</p>
      </div>
    </section>
  );
}
