import { getLocale } from "next-intl/server";
import { HOME_SEO } from "@/lib/homeSeoContent";
import { getRegionPriceStats } from "@/lib/regionPriceStats";
import RichText from "@/components/home/RichText";
import RegionPriceCard from "@/components/home/RegionPriceCard";
import HomeFaq from "@/components/home/HomeFaq";

// Sections SEO de l'accueil (refonte du 2026-11-27, cible « location de chalet au Québec ») : texte de présentation à
// gauche, tableau des prix par région à droite (données Kabanalouer calculées côté serveur, rendu dans le HTML), puis la
// FAQ (components/home/HomeFaq.tsx, JSON-LD FAQPage). Les liens de la page sont ceux demandés (thèmes, régions,
// comparatif) ; rien n'est inventé : les chiffres viennent des fiches publiées.
export default async function HomeSeoSection() {
  const [locale, stats] = await Promise.all([getLocale(), getRegionPriceStats()]);
  const lang = locale === "en" ? "en" : "fr";
  const c = HOME_SEO[lang];
  const showCard = stats.rows.length > 0;

  return (
    <>
      <section className="w-full bg-white py-[clamp(64px,8vw,112px)]">
        <div
          className={`mx-auto grid max-w-[1280px] gap-10 px-[clamp(16px,4vw,56px)] ${
            showCard ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-[clamp(40px,6vw,80px)]" : ""
          } lg:items-start`}
        >
          <div className="min-w-0">
            <h2 className="text-balance text-[length:var(--fs-display)] font-extrabold leading-[1.02] tracking-[-0.04em] text-charcoal-800">
              {c.title}
            </h2>
            <p className="mt-6 text-[length:clamp(17px,1.5vw,19px)] leading-[1.6] text-charcoal-600">{c.lead}</p>

            <div className="mt-7 flex flex-col gap-7 border-t border-[var(--border-1)] pt-7">
              {c.blocks.map((b) => (
                <div key={b.title}>
                  <h3 className="text-xl font-bold tracking-[-0.02em] text-charcoal-800">{b.title}</h3>
                  <p className="mt-2 text-pretty text-base leading-[1.65] text-charcoal-600">
                    <RichText markup={b.body} locale={locale} />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {showCard && <RegionPriceCard stats={stats} locale={locale} />}
        </div>
      </section>

      <HomeFaq locale={locale} />
    </>
  );
}
