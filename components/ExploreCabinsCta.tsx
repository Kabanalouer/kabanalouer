import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";

// Bandeau vert « Moins de frais, plus de feux de camp » juste avant le pied de
// page — partagé par Comment ça marche et À propos (textes : commentCaMarche.cta*).
export default async function ExploreCabinsCta() {
  const [t, locale] = await Promise.all([getTranslations("commentCaMarche"), getLocale()]);

  return (
    <section className="bg-primary py-20">
      <div className="max-w-2xl mx-auto px-4 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">{t("ctaTitle")}</h2>
        <p className="text-white/80 text-lg mb-10">{t("ctaSubtitle")}</p>
        <Link
          href={localePath("/chalets", locale)}
          className="inline-block bg-white text-primary font-bold px-10 py-4 rounded-full hover:bg-charcoal-50 transition-colors text-lg"
        >
          {t("ctaBtn")}
        </Link>
      </div>
    </section>
  );
}
