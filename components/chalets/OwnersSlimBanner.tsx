import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";

// Bannière proprios mince, en fin de liste de la page de résultats seulement (l'accueil garde sa bannière).
export default function OwnersSlimBanner({ title }: { title?: string } = {}) {
  const t = useTranslations("chaletsMap");
  const locale = useLocale();
  const href = localePath(
    `/signup?role=host&next=${encodeURIComponent(localePath("/dashboard/listings/new", locale))}`,
    locale
  );

  return (
    <a
      href={href}
      className="mt-4 flex flex-col sm:flex-row sm:items-center gap-5 rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] p-5 sm:p-[14px] text-white"
    >
      <Image
        src="/images/devenir-hote/chalet-soiree.jpg"
        alt=""
        width={88}
        height={64}
        className="hidden sm:block h-16 w-[88px] flex-none rounded-[10px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--fg-eyebrow-on-inverse)]">
          {t("ownersEyebrow")}
        </p>
        <p className="mt-1 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-white">
          {title ?? t("ownersTitle")}
        </p>
        <p className="mt-1 text-sm text-[var(--fg-muted-on-inverse)]">{t("ownersSub")}</p>
      </div>
      <span className="inline-flex h-12 w-full sm:h-auto sm:w-auto flex-none items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--action-on-dark)] px-[18px] sm:py-3 text-sm font-bold text-white">
        {t("ownersCta")}
      </span>
    </a>
  );
}
