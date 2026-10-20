import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { REGIONS } from "@/lib/regions";
import { getThemeLinkVisibility } from "@/lib/themeLinks";
import { safeJsonLd } from "@/lib/jsonLd";
import { localePath } from "@/lib/localePath";

// Texte de présentation et FAQ de l'accueil (2026-10-20, décision de Simon) : cible le mot-clé
// « location de chalet au Québec ». Le texte et les questions sont visibles ; les mêmes questions
// alimentent le JSON-LD FAQPage. Les liens vers les régions n'incluent que celles qui ont au moins
// un chalet publié (jamais de lien vers une page vide). Rien d'inventé : seulement ce que fait le site.

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export default async function HomeSeoSection() {
  const [t, locale, show] = await Promise.all([getTranslations("homeSeo"), getLocale(), getThemeLinkVisibility()]);
  const isEn = locale === "en";

  const regionLinks = REGIONS.filter((r) => show.activeRegionSlugs.includes(r.slug)).map((r) => ({
    href: isEn ? `/en/cabins/${r.slugEn}` : `/chalets/${r.slug}`,
    label: isEn ? `Cabin rentals in ${r.nameEn}` : `Location de chalet ${r.locative}`,
  }));

  const faq = FAQ_KEYS.map((k) => ({ question: t(k), answer: t(`${k}a`) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 w-full">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <h2 className="text-3xl font-bold text-charcoal-800 tracking-h2 leading-snug mb-6">{t("title")}</h2>
      <div className="space-y-5 text-base leading-relaxed text-charcoal-600">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
      </div>

      {regionLinks.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-3" aria-label={t("regionsLabel")}>
          {regionLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-block rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-sm font-medium text-charcoal-700 hover:border-charcoal-300 hover:text-charcoal-800 transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-base">
        <Link href={localePath("/chalets", locale)} className="font-semibold text-primary underline underline-offset-4 hover:text-primary-dark">
          {t("browseAll")}
        </Link>
      </p>

      <h2 className="mt-20 text-3xl font-bold text-charcoal-800 tracking-h2 leading-snug mb-8">{t("faqTitle")}</h2>
      <div className="divide-y divide-[#ebebeb] border-y border-[#ebebeb]">
        {faq.map((f) => (
          <details key={f.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-charcoal-800">
              {f.question}
              <svg className="h-5 w-5 shrink-0 text-charcoal-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <p className="mt-3 text-base leading-relaxed text-charcoal-600">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
