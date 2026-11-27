import Link from "next/link";
import { FAQ_ACCUEIL, plainText } from "@/lib/faqAccueil";
import { HOME_SEO } from "@/lib/homeSeoContent";
import { safeJsonLd } from "@/lib/jsonLd";
import { localePath } from "@/lib/localePath";
import RichText from "@/components/home/RichText";

// FAQ de l'accueil : <details> natifs (les réponses restent dans le HTML, donc lisibles par Google même fermées),
// la 1re question ouverte. Le JSON-LD FAQPage vient du même fichier de données (lib/faqAccueil.ts) : texte identique
// à l'affichage. Un seul FAQPage sur la page d'accueil.
export default function HomeFaq({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const lang = isEn ? "en" : "fr";
  const c = HOME_SEO[lang].faq;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ACCUEIL.map((f) => ({
      "@type": "Question",
      name: f[lang].q,
      acceptedAnswer: { "@type": "Answer", text: plainText(f[lang].a) },
    })),
  };

  return (
    <section className="w-full bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,56px)]">
        <div className="grid gap-8 border-t border-[var(--border-1)] pb-[clamp(64px,8vw,112px)] pt-[clamp(64px,8vw,112px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-[clamp(32px,6vw,80px)]">
        <div className="lg:sticky lg:top-[100px] lg:self-start">
          <h2 className="max-w-[420px] text-balance text-[length:var(--fs-display)] font-extrabold leading-[1.02] tracking-[-0.04em] text-charcoal-800">
            {c.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-charcoal-600">
            {c.contactBefore}{" "}
            <Link href={localePath("/contact", locale)} className="font-semibold text-link hover:underline underline-offset-4">
              {c.contactLink}
            </Link>
          </p>
        </div>

        <div>
          {FAQ_ACCUEIL.map((f, i) => (
            <details key={f.id} open={i === 0} className="group border-t border-[var(--border-2)] last:border-b">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-5 py-[22px] [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] hover:[&_h3]:text-action">
                <h3 className="text-[length:clamp(17px,1.6vw,19px)] font-bold leading-[1.35] tracking-[-0.015em] text-charcoal-800 transition-colors">
                  {f[lang].q}
                </h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-2)] text-lg leading-none text-charcoal-800" aria-hidden="true">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="max-w-[68ch] text-pretty pb-5 pr-0 text-base leading-[1.65] text-charcoal-600 sm:pb-6 sm:pr-[52px]">
                <RichText markup={f[lang].a} locale={locale} />
              </p>
            </details>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
