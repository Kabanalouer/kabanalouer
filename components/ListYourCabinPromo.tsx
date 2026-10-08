"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { isLaunchOfferActive } from "@/lib/launchOffer";

// Encart « Affichez votre chalet ici » montré quand une recherche ne donne
// aucun résultat (recherche /chalets, page région vide) : transforme une page
// vide en invitation pour les proprios du secteur.
export default function ListYourCabinPromo() {
  const t = useTranslations("listYourCabinPromo");
  const locale = useLocale();
  // Mention « gratuit » seulement pendant l'offre de lancement.
  const offerActive = isLaunchOfferActive();

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-primary-100 bg-primary-50 px-6 py-7 text-center">
      <p className="text-xs font-semibold tracking-[0.08em] uppercase text-primary">{t("eyebrow")}</p>
      <p className="mt-2 text-heading-3 font-bold text-charcoal-800 text-balance">{offerActive ? t("title") : t("titleRegular")}</p>
      <p className="mt-2 text-base text-charcoal-600 text-pretty">{offerActive ? t("body") : t("bodyRegular")}</p>
      <Link
        href={localePath("/devenir-hote", locale)}
        className="mt-5 inline-flex items-center justify-center bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
