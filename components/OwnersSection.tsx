import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import { StandaloneCreateListingLink } from "@/components/devenir-hote/OwnerAccess";
import OwnersBanner, { BannerPlusIcon, BannerSearchIcon, OWNERS_BANNER_PRIMARY_BTN, OWNERS_BANNER_SECONDARY_BTN } from "@/components/OwnersBanner";

// Bannière « Pour les propriétaires » des pages publiques (accueil, recherche, régions, villes, thèmes), juste avant
// le pied de page. Même bannière que le bas de /devenir-hote (components/OwnersBanner.tsx, la référence). « Gratuit »,
// sans durée ni date.
export default async function OwnersSection() {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const findPath = localePath("/trouver-mon-chalet", locale);
  const title = `${t("ownersTitleLine1")} ${t("ownersTitleLine2")} ${t("ownersTitleAccent")}`;

  return (
    <section className="bg-white px-[clamp(20px,4vw,48px)] py-[clamp(56px,7vw,96px)]">
      <OwnersBanner title={title} subtitle={t("ownersDesc")}>
        <Link href={findPath} className={OWNERS_BANNER_PRIMARY_BTN}>
          <BannerSearchIcon />
          {t("ownersFindBtn")}
        </Link>
        <StandaloneCreateListingLink emplacement="banniere_site" className={OWNERS_BANNER_SECONDARY_BTN}>
          <BannerPlusIcon />
          {t("ownersImportBtn")}
        </StandaloneCreateListingLink>
      </OwnersBanner>
    </section>
  );
}
