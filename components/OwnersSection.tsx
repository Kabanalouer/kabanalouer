import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { REGULAR_PRICE_CENTS } from "@/lib/launchOffer";
import { SITE_IS_FREE } from "@/lib/siteIsFree";
import { formatPriceLabel } from "@/lib/subscriptionPricing";
import { StandaloneCreateListingLink } from "@/components/devenir-hote/OwnerAccess";
import OwnersBanner, { BannerPlusIcon, BannerSearchIcon, OWNERS_BANNER_PRIMARY_BTN, OWNERS_BANNER_SECONDARY_BTN } from "@/components/OwnersBanner";

// Bannière « Pour les propriétaires » des pages publiques (accueil, recherche, régions, villes, thèmes), juste avant
// le pied de page. Même bannière que le bas de /devenir-hote (components/OwnersBanner.tsx, la référence). « Gratuit »,
// sans durée ni date (lib/siteIsFree.ts) ; à false : « Sans commission » et le prix annuel.
export default async function OwnersSection() {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const offerActive = SITE_IS_FREE;
  const regularPrice = formatPriceLabel(REGULAR_PRICE_CENTS, locale === "en" ? "en" : "fr");
  const landing = localePath("/devenir-hote", locale);
  const findPath = localePath("/trouver-mon-chalet", locale);

  const title = offerActive
    ? `${t("ownersTitleLine1")} ${t("ownersTitleLine2")} ${t("ownersTitleAccent")}`
    : `${t("ownersTitleLine1")} ${t("ownersTitleLine2Regular")} ${t("ownersTitleAccentRegular")}`;

  return (
    <section className="bg-white px-[clamp(20px,4vw,48px)] py-[clamp(56px,7vw,96px)]">
      <OwnersBanner title={title} subtitle={offerActive ? t("ownersDesc") : t("ownersDescRegular", { price: regularPrice })}>
        <Link href={offerActive ? findPath : landing} className={OWNERS_BANNER_PRIMARY_BTN}>
          {offerActive && <BannerSearchIcon />}
          {offerActive ? t("ownersFindBtn") : t("ctaButtonRegular")}
        </Link>
        {offerActive && (
          <StandaloneCreateListingLink emplacement="banniere_site" className={OWNERS_BANNER_SECONDARY_BTN}>
            <BannerPlusIcon />
            {t("ownersImportBtn")}
          </StandaloneCreateListingLink>
        )}
      </OwnersBanner>
    </section>
  );
}
