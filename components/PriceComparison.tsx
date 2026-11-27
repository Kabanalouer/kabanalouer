import { getLocale, getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/formatPrice";

// Exemple fictif affiché sur la page d'accueil (section « Notre différence ») :
// même chalet, mêmes dates, prix total avec les frais de service de chaque
// plateforme. Ordre volontairement non trié — Kabanalouer en 2ᵉ. À remplacer
// par un relevé réel : changer NIGHTLY_PRICE / NIGHTS / feeRate ici suffit.
// 319 $ × 3 nuits = 957 $ affiché pour Kabanalouer. Les taux ne sont jamais
// affichés : seuls les prix totaux et le montant des frais le sont.
const NIGHTLY_PRICE = 319;
const NIGHTS = 3;
const PLATFORMS: { name: string; feeRate: number; isKabanalouer?: boolean }[] = [
  { name: "Vrbo", feeRate: 0.12 },
  { name: "Kabanalouer", feeRate: 0, isKabanalouer: true },
  { name: "Booking.com", feeRate: 0.10 },
  { name: "Airbnb", feeRate: 0.155 },
];

const EASE = "duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export default async function PriceComparison() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const money = (n: number) =>
    formatPrice(Math.round(n).toLocaleString(locale === "en" ? "en-CA" : "fr-CA"), locale);

  const base = NIGHTLY_PRICE * NIGHTS;
  const maxFee = Math.max(...PLATFORMS.map((p) => base * p.feeRate));

  return (
    <section className="section-dark py-24 px-4 sm:px-6">
      <div className="max-w-[560px] mx-auto flex flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-[color:var(--fg-eyebrow-on-inverse)]">
          {t("whyLabel")}
        </p>
        <h2 className="text-[length:var(--fs-display)] leading-none font-extrabold tracking-[-0.04em] text-white text-balance">
          {t("compareTitle")}{" "}
          <span className="text-action-on-dark">{t("compareTitleAccent")}</span>
        </h2>
        <p className="text-[17px] leading-[1.6] text-[color:var(--fg-muted-on-inverse)] text-pretty">
          {t("compareDesc")}
        </p>

        <div className="w-full mt-4 text-left overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 flex justify-between gap-3 text-[13px] text-[color:var(--fg-muted-on-inverse)]">
            <span className="font-semibold text-white">{t("compareCardListing")}</span>
            <span>{t("compareCardStay", { nights: NIGHTS })}</span>
          </div>

          <div className="p-3 sm:p-5 flex flex-col gap-2">
            {PLATFORMS.map((p) =>
              p.isKabanalouer ? (
                <div
                  key={p.name}
                  className={`flex justify-between items-center gap-3 px-3.5 sm:px-[18px] py-3.5 rounded-xl bg-white text-charcoal-800 cursor-default transition-[box-shadow] ${EASE} hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-wordmark.svg" alt="Kabanalouer" width={238} height={50} className="h-6 sm:h-9 w-auto shrink-0" />
                  {/* min-w-0 + texte qui peut passer à la ligne : tient dans la carte sur un écran de 320 px */}
                  <div className="flex flex-col items-end gap-0.5 min-w-0 text-right">
                    <span className="text-2xl sm:text-[28px] font-extrabold tracking-h2 whitespace-nowrap text-charcoal-800">{money(base)}</span>
                    <span className="text-xs font-semibold text-action sm:whitespace-nowrap">{t("compareNoFees")}</span>
                  </div>
                </div>
              ) : (
                <div
                  key={p.name}
                  className={`flex justify-between items-center gap-3 px-3.5 sm:px-[18px] py-3.5 rounded-xl bg-white/[.06] cursor-default transition-[background-color] ${EASE} hover:bg-white/10`}
                >
                  <span className="min-w-0 text-[17px] font-bold text-white">{p.name}</span>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 text-right text-[color:var(--fg-muted-on-inverse)]">
                    <span className="text-[22px] font-bold tracking-h3 whitespace-nowrap line-through">{money(base * (1 + p.feeRate))}</span>
                    <span className="text-xs whitespace-nowrap">{t("compareFeeIncluded", { fee: money(base * p.feeRate) })}</span>
                  </div>
                </div>
              )
            )}

            <p className="pt-8 text-center text-[17px] font-bold text-white">
              {t("compareSaving")}{" "}
              <span className="block mt-2 text-[length:var(--fs-stat)] font-extrabold tracking-[-0.06em] leading-[.82] text-action-on-dark whitespace-nowrap">{money(maxFee)}</span>
            </p>
            <p className="pt-4 text-center text-xs leading-normal text-[color:var(--fg-muted-on-inverse)] text-pretty">
              {t("compareDisclaimer", { nights: NIGHTS })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
