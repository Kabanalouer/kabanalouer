import { getLocale, getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/formatPrice";

// Exemple fictif affiché sur l'accueil (section « Notre différence », option 4a) : même chalet, mêmes dates, prix total
// avec les frais de service de chaque plateforme. Toutes les valeurs sont ici : pour les remplacer par un relevé réel,
// il suffit de changer cet objet. Le chiffre vedette est calculé (le plus gros montant de frais), jamais écrit à la main.
// Le libellé du chalet et celui du séjour viennent des traductions (home.compareCardListing / compareCardStay).
const comparison = {
  chalet: "Chalet du Lac · Laurentides",
  nights: 3,
  kabanalouer: 957,
  others: [
    { name: "Airbnb", total: 1105, fee: 148 },
    { name: "Vrbo", total: 1072, fee: 115 },
    { name: "Booking.com", total: 1053, fee: 96 },
  ],
};

export default async function PriceComparison() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  // « 1 105 $ » (espace insécable avant le $) en français, « $1,105 » en anglais.
  const money = (n: number) =>
    formatPrice(Math.round(n).toLocaleString(locale === "en" ? "en-CA" : "fr-CA"), locale).replace(" $", " $");

  const nights = comparison.nights;
  // Du plus cher au moins cher.
  const others = [...comparison.others].sort((a, b) => b.total - a.total);
  const biggestSaving = Math.max(...others.map((o) => o.fee));

  const cell = "align-middle";
  const mutedOnDark = "text-[color:var(--fg-muted-on-inverse)]";

  return (
    <section id="comparatif" className="section-dark py-[clamp(64px,9vw,128px)]">
      <div className="mx-auto max-w-[1280px] px-[clamp(20px,4vw,64px)] grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:items-center">
        {/* Texte : eyebrow, H2, chiffre vedette, paragraphe */}
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--fg-eyebrow-on-inverse)]">
            {t("whyLabel")}
          </p>
          <h2 className="text-[28px] sm:text-[length:clamp(28px,3vw,36px)] leading-[1.05] font-extrabold tracking-[-0.035em] text-white">
            {t("compareTitle")} <span className="text-highlight">{t("compareTitleAccent")}</span>
          </h2>
          <div className="flex flex-col gap-1">
            <span className="whitespace-nowrap text-[length:clamp(88px,26vw,120px)] sm:text-[length:min(var(--fs-stat),184px)] font-extrabold tracking-[-0.06em] leading-[.82] text-action-on-dark">
              {money(biggestSaving)}
            </span>
            <span className="text-[length:clamp(17px,1.6vw,20px)] font-bold text-white">{t("compareSavedOn", { nights })}</span>
          </div>
          <p className={`max-w-[44ch] text-base leading-[1.6] text-pretty ${mutedOnDark}`}>{t("compareDesc")}</p>
        </div>

        {/* Tableau : Kabanalouer en premier, puis les plateformes du plus cher au moins cher */}
        <div>
          <table className="w-full border-separate [border-spacing:0_10px]">
            <caption className="sr-only">{t("compareCaption", { nights })}</caption>
            <thead>
              <tr className={`text-sm ${mutedOnDark}`}>
                <th scope="col" className="px-4 sm:px-[22px] pb-1 text-left font-normal">{t("compareCardListing")}</th>
                <th scope="col" className="px-4 sm:px-[22px] pb-1 text-right font-normal">{t("compareCardStay", { nights })}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${cell} rounded-l-[var(--radius-lg)] bg-white shadow-[1px_0_0_0_#fff] px-4 py-[14px] sm:px-[22px] sm:py-5 text-left font-normal`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-wordmark.svg" alt="Kabanalouer" width={238} height={50} className="h-[22px] sm:h-[26px] w-auto max-w-none shrink-0" />
                </th>
                <td className={`${cell} rounded-r-[var(--radius-lg)] bg-white px-4 py-[14px] sm:px-[22px] sm:py-5 text-right`}>
                  <span className="sr-only">{t("compareTotalSr")} </span>
                  <span className="block whitespace-nowrap text-[length:clamp(24px,2.4vw,30px)] font-extrabold leading-tight text-charcoal-800">{money(comparison.kabanalouer)}</span>
                  <span className="block text-[13px] font-bold text-action">{t("compareNoFees")}</span>
                </td>
              </tr>
              {others.map((o) => (
                <tr key={o.name}>
                  <th scope="row" className={`${cell} min-w-0 rounded-l-[var(--radius-lg)] bg-white/[.06] px-4 py-[14px] sm:px-[22px] sm:py-[18px] text-left text-base font-normal text-[#ddd]`}>
                    {o.name}
                  </th>
                  <td className={`${cell} rounded-r-[var(--radius-lg)] bg-white/[.06] px-4 py-[14px] sm:px-[22px] sm:py-[18px] text-right ${mutedOnDark}`}>
                    <span className="sr-only">{t("compareTotalSr")} </span>
                    <span className="block whitespace-nowrap text-[19px] sm:text-[22px] font-bold leading-tight line-through">{money(o.total)}</span>
                    <span className="block whitespace-nowrap text-[13px]">{t("compareFeeIncluded", { fee: money(o.fee) })}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`mt-2 text-xs leading-normal text-pretty ${mutedOnDark}`}>{t("compareDisclaimer", { nights })}</p>
        </div>
      </div>
    </section>
  );
}
