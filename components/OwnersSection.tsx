import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath } from "@/lib/localePath";

const STATS = [
  { value: "ownersStat1Value", label: "ownersStat1Label" },
  { value: "ownersStat2Value", label: "ownersStat2Label" },
  { value: "ownersStat3Value", label: "ownersStat3Label" },
] as const;

// Section « Pour les propriétaires » de la page d'accueil, juste avant le pied
// de page. Aucun prix d'abonnement ici (choix de Simon, 2026-09-29) — les
// tarifs restent sur /tarifs.
export default async function OwnersSection() {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);

  return (
    <section className="bg-primary text-white py-24 px-6">
      <div className="max-w-[560px] mx-auto flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary-100">
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
          <div className="flex flex-wrap justify-center gap-5 sm:gap-12 pt-2">
            {STATS.map((s) => (
              <div key={s.value} className="flex flex-col gap-0.5">
                <span className="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.03em]">{t(s.value)}</span>
                <span className="text-[13px] text-primary-100">{t(s.label)}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={localePath("/devenir-hote", locale)}
          className="inline-flex items-center bg-white text-primary font-bold text-base px-7 py-4 rounded-full transition-[background-color,color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary-50 hover:text-primary-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </section>
  );
}
