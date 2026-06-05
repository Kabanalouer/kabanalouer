import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";

export default async function OwnerCTA({ className }: { className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("ownerCta"), getLocale()]);

  return (
    <section className={`bg-primary py-16${className ? ` ${className}` : ""}`}>
      <div className="max-w-2xl mx-auto px-4 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">{t("title")}</h2>
        <p className="text-white/80 text-lg mb-8">{t("subtitle")}</p>
        <Link
          href={localePath("/devenir-hote", locale)}
          className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
