import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { formatLaunchOfferEnd, isLaunchOfferActive, REGULAR_PRICE_CENTS } from "@/lib/launchOffer";
import { formatPriceLabel } from "@/lib/subscriptionPricing";

// Section « Pour les propriétaires » de la page d'accueil, juste avant le pied
// de page. Pendant l'offre de lancement (lib/launchOffer.ts) : pastille, « C'est
// gratuit » et date limite ; ensuite « Sans commission » et le prix annuel.
export default async function OwnersSection() {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const offerActive = isLaunchOfferActive();
  const deadline = formatLaunchOfferEnd(locale);
  const regularPrice = formatPriceLabel(REGULAR_PRICE_CENTS, locale === "en" ? "en" : "fr");

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Carte contenue : même photo que le CTA final de /devenir-hote, assombrie pour la lisibilité */}
        <div className="relative rounded-[16px] overflow-hidden text-white">
          <Image
            src="/images/devenir-hote/chalet-soiree.jpg"
            alt=""
            fill
            loading="lazy"
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-[rgba(15,14,12,0.7)] sm:hidden" />
          <div className="absolute inset-0 hidden sm:block bg-[linear-gradient(to_right,rgba(15,14,12,.88)_0%,rgba(15,14,12,.55)_50%,rgba(15,14,12,.05)_100%)]" />

          <div className="relative max-w-[520px] box-content p-8 sm:p-12 flex flex-col items-start gap-10">
            <div className="flex flex-col items-start gap-6 text-left">
              {offerActive && (
                <p className="inline-flex items-center rounded-full bg-[#dce7a8] px-4 py-1.5 text-xs font-bold tracking-[0.08em] uppercase text-primary-dark">
                  {t("ctaLabel")}
                </p>
              )}
              <h2 className="text-[32px] sm:text-[44px] leading-[1.08] font-extrabold tracking-h2 text-balance">
                {t("ownersTitleLine1")}
                <br />
                {offerActive ? (
                  <>{t("ownersTitleLine2")} <span className="text-[#dce7a8]">{t("ownersTitleAccent")}</span></>
                ) : (
                  <>{t("ownersTitleLine2Regular")} <span className="text-[#dce7a8]">{t("ownersTitleAccentRegular")}</span></>
                )}
              </h2>
              <p className="text-[17px] leading-[1.6] text-white/80 text-pretty">
                {offerActive ? t("ownersDesc") : t("ownersDescRegular", { price: regularPrice })}
              </p>
              {offerActive && deadline && (
                <p className="inline-flex items-center gap-2 text-lg font-bold text-white">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  {t("ownersDeadline", { date: deadline })}
                </p>
              )}
            </div>

            <Link
              href={localePath("/devenir-hote", locale)}
              className="inline-flex items-center bg-white text-primary font-bold text-base px-7 py-4 rounded-full transition-[background-color,color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary-50 hover:text-primary-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
            >
              {offerActive ? t("ctaButton") : t("ctaButtonRegular")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
