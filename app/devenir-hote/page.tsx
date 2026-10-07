import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CreateListingLink, OwnerAccessProvider } from "@/components/devenir-hote/OwnerAccess";
import {
  FaqAccordion,
  ImportForm,
  SavingsCalculator,
  ScrollToImportButton,
  StickyCta,
} from "@/components/devenir-hote/LandingInteractive";
import { getDevenirHoteContent } from "@/lib/devenirHoteContent";
import { safeJsonLd } from "@/lib/jsonLd";
import { localePath } from "@/lib/localePath";
import { buildListingPath } from "@/lib/listingUrl";
import { formatPrice } from "@/lib/formatPrice";
import { SITE_URL } from "@/lib/siteUrl";

const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getLocale()) === "en";
  const canonical = isEn ? "/en/become-a-host" : "/devenir-hote";
  // Le gabarit du layout racine ajoute « | Kabanalouer ».
  const title = isEn ? "List your cabin for free" : "Devenir hôte — Publiez votre chalet gratuitement";
  const description = isEn
    ? "List your cabin on Kabanalouer: free for the first year, 0% commission, no transaction fees. Offer valid for sign-ups before October 31, 2026."
    : "Publiez votre chalet sur Kabanalouer : gratuit la première année, 0 % commission, aucuns frais de transaction. Offre valable pour toute inscription avant le 31 octobre 2026.";
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: "/devenir-hote", en: "/en/become-a-host", "x-default": "/devenir-hote" },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Kabanalouer",
      locale: isEn ? "en_CA" : "fr_CA",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

// Fiche réelle (Chalet Authentik 50). Même rendu que components/ListingCard,
// mais côté serveur : ListingCard embarque le client Supabase (bouton favori,
// ~240 Ko) sur une page où la carte est masquée sur mobile — Lighthouse
// mobile passait de 90+ à 76. Photo fournie par le client, servie localement
// plutôt que depuis le CDN d'Airbnb où sont stockées les photos importées.
const HERO_LISTING = {
  title: "Chalet Authentik 50 | Spa, Piscine chauffée & Lac",
  region: "Laurentides",
  city: "Mille-Isles",
  listing_number: 48347,
  custom_slug: "chalet-authentik-50",
  price: 350,
  capacity: 16,
  bedrooms: 5,
  photo: "/images/devenir-hote/chalet-authentik.webp",
};

const EYEBROW = "text-xs font-bold tracking-[0.08em] uppercase text-primary";
const H2 =
  "m-0 text-[clamp(32px,3.8vw,48px)] leading-[1.08] font-extrabold tracking-h2 text-charcoal-800 text-balance";
const SECTION_X = "px-[clamp(20px,4vw,48px)]";
const SECTION_Y = "py-[clamp(72px,9vw,128px)]";
const BTN_MOTION =
  "transition-[background-color,transform] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export default async function DevenirHotePage() {
  const locale = await getLocale();
  const c = getDevenirHoteContent(locale);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <OwnerAccessProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      <div className="flex flex-col min-h-screen bg-white">
        <Navbar />

        <main className="flex-1">
          {/* ── 01 Hero : gratuité seulement ── */}
          <section className={`${SECTION_X} pt-[clamp(24px,4.5vw,72px)] pb-[clamp(56px,7vw,96px)]`}>
            <div className="mx-auto max-w-[1240px] grid items-center gap-[clamp(40px,5vw,72px)] lg:grid-cols-2">
              <div className="flex flex-col gap-[clamp(18px,2vw,26px)]">
                <p className="m-0 inline-flex self-start items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-[13px] font-bold px-3.5 py-[7px] rounded-full">
                  <span className="w-2 h-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {c.hero.badge}
                </p>
                <h1 className="m-0 text-[clamp(40px,5.4vw,68px)] leading-[1.02] font-bold text-charcoal-800 text-balance">
                  {c.hero.h1Line1}
                  <br />
                  {c.hero.h1Pre}
                  <span className="text-primary">{c.hero.h1Accent}</span>
                  {c.hero.h1Post}
                </h1>
                <p className="m-0 text-[clamp(17px,1.5vw,20px)] leading-[1.55] text-charcoal-600 max-w-[540px] text-pretty">
                  {c.hero.subtitle}
                </p>
                <div className="flex flex-col gap-3 max-w-[580px]">
                  <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                    <CreateListingLink
                      emplacement="hero"
                      className={`flex items-center justify-center gap-2.5 h-[58px] px-5 rounded-full bg-primary text-white text-base font-bold shadow-[var(--shadow-md)] hover:bg-primary-dark ${BTN_MOTION}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {c.hero.ctaCreate}
                    </CreateListingLink>
                    <ScrollToImportButton
                      emplacement="hero"
                      className={`flex items-center justify-center gap-2.5 h-[58px] px-5 rounded-full bg-white text-charcoal-800 text-base font-bold border-[1.5px] border-charcoal-800 hover:bg-charcoal-50 ${BTN_MOTION}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {c.hero.ctaDuplicate}
                    </ScrollToImportButton>
                  </div>
                  <p className="m-0 text-sm font-semibold text-charcoal-400">{c.hero.note}</p>
                </div>
              </div>

              {/* Carte : ≥ 1024 px seulement, jamais sous les CTA */}
              <div className="hidden lg:flex justify-center">
                <div className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-[var(--shadow-xl)] p-3.5 pb-[22px] rotate-[1.2deg]">
                  <HeroListingCard locale={locale} pill={c.hero.cardPill} />
                </div>
              </div>
            </div>
          </section>

          {/* ── 02 Duplication Airbnb ── */}
          <section id="import" className={`${SECTION_X} ${SECTION_Y} bg-charcoal-50`}>
            <div className="mx-auto max-w-[1240px] flex flex-col gap-[clamp(40px,5vw,64px)]">
              <div className="flex flex-col gap-5">
                <p className={`m-0 ${EYEBROW}`}>{c.importSection.eyebrow}</p>
                <h2 className={H2}>{c.importSection.h2}</h2>
                <p className="m-0 text-lg leading-[1.6] text-charcoal-600 text-pretty">{c.importSection.subtitle}</p>
                <div className="flex flex-col gap-2.5">
                  <ImportForm c={c.importSection} />
                  <p className="m-0 text-sm text-charcoal-400">
                    {c.importSection.noAirbnb}{" "}
                    <CreateListingLink
                      emplacement="import"
                      className="font-bold text-primary-dark hover:text-primary-press hover:underline"
                    >
                      {c.importSection.createFromScratch}
                    </CreateListingLink>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <h3 className="m-0 text-heading-2 font-semibold tracking-h2 text-charcoal-800">{c.importSection.stepsTitle}</h3>
                <ol className="m-0 p-0 list-none grid gap-8 md:grid-cols-3">
                  {c.importSection.steps.map((step, i) => (
                    <li key={step.title} className="border-t border-[#222] pt-5 flex flex-col gap-2.5">
                      <span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-charcoal-400" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h4 className="m-0 text-lg font-semibold tracking-h3 text-charcoal-800">{step.title}</h4>
                      <p className="m-0 text-[15px] leading-[1.55] text-charcoal-400">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* ── 03 Gratuit ── */}
          <section className={`${SECTION_X} ${SECTION_Y}`}>
            <div className="mx-auto max-w-[880px] flex flex-col gap-[clamp(40px,5vw,64px)]">
              <div className="flex flex-col gap-5">
                <p className={`m-0 ${EYEBROW}`}>{c.free.eyebrow}</p>
                <h2 className={H2}>{c.free.h2}</h2>
                <p className="m-0 text-lg leading-[1.6] text-charcoal-600 text-pretty">{c.free.subtitle}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 bg-primary-50 border border-primary-100 rounded-lg px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-charcoal-500">{c.free.regularLabel}</span>
                    <s className="text-lg font-bold text-charcoal-500 decoration-2">{c.free.regularPrice}</s>
                  </div>
                  <svg className="w-[22px] h-[22px] text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-primary-700">{c.free.offerLabel}</span>
                    <span className="text-[26px] font-extrabold tracking-h2 leading-[1.1] text-primary-700">
                      {c.free.offerPricePre}
                      <sup>{c.free.offerPriceSup}</sup>
                      {c.free.offerPricePost}
                    </span>
                  </div>
                </div>
                <ul className="m-0 p-0 pt-1 list-none flex flex-col gap-3">
                  {c.free.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-base font-semibold text-charcoal-800">
                      <svg className="w-5 h-5 shrink-0 mt-0.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <SavingsCalculator c={c.calculator} locale={locale} />
            </div>
          </section>

          {/* ── 04 Fonctionnalités ── */}
          <section className={`${SECTION_X} ${SECTION_Y}`}>
            <div className="mx-auto max-w-[1240px] flex flex-col gap-[clamp(40px,5vw,56px)]">
              <div className="flex flex-col gap-4">
                <p className={`m-0 ${EYEBROW}`}>{c.features.eyebrow}</p>
                {/* Taille réduite sur mobile pour tenir sur une seule ligne */}
                <h2 className="m-0 text-[clamp(22px,3.8vw,48px)] leading-[1.08] font-extrabold tracking-h2 text-charcoal-800 whitespace-nowrap">
                  {c.features.h2}
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-primary-800 rounded-2xl p-[clamp(28px,4vw,48px)] grid gap-9 items-center grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))]">
                  <div className="flex flex-col gap-4">
                    <span className="self-start text-xs font-bold tracking-[0.08em] uppercase text-primary-800 bg-primary-200 px-2.5 py-[5px] rounded-full">
                      {c.features.badge}
                    </span>
                    <h3 className="m-0 text-[clamp(26px,2.8vw,34px)] leading-[1.12] font-extrabold tracking-h2 text-white text-balance">
                      {c.features.aiTitle}
                    </h3>
                    <p className="m-0 text-[17px] leading-[1.6] text-primary-100 text-pretty">{c.features.aiText}</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 flex flex-col gap-3.5 shadow-[var(--shadow-xl)]" aria-hidden="true">
                    <p className="m-0 self-end max-w-[85%] bg-charcoal-100 text-charcoal-800 text-sm leading-[1.5] px-3.5 py-3 rounded-[16px_16px_4px_16px]">
                      {c.features.chatQuestion}
                    </p>
                    <div className="flex flex-col gap-2.5 text-sm leading-[1.5] text-charcoal-600">
                      <span>{c.features.chatAnswer}</span>
                      <div className="flex items-center gap-3 border border-charcoal-100 rounded-xl p-2.5">
                        <Image
                          src="/images/devenir-hote/chalet-aerien.jpg"
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          className="w-16 h-16 shrink-0 rounded-lg object-cover bg-charcoal-100"
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-bold text-charcoal-800">{c.features.chatCardTitle}</span>
                          <span className="text-[13px] text-charcoal-400">{c.features.chatCardMeta}</span>
                          <span className="text-xs font-bold text-primary-600">kabanalouer.ca</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {c.features.items.map((f, i) => (
                  <div key={f.title} className="border border-charcoal-100 rounded-xl px-7 py-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex-[0_0_260px] flex items-center gap-3.5">
                      <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-50 flex items-center justify-center">
                        <svg className="w-[22px] h-[22px] text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={FEATURE_ICONS[i]} />
                        </svg>
                      </span>
                      <h3 className="m-0 text-[19px] font-bold tracking-h3 text-charcoal-800">{f.title}</h3>
                    </div>
                    <p className="m-0 flex-[1_1_320px] text-[15px] leading-[1.6] text-charcoal-600 text-pretty">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 05 Comparaison ── */}
          <section className={`${SECTION_X} pb-[clamp(72px,9vw,128px)]`}>
            <div className="mx-auto max-w-[880px] flex flex-col gap-8">
              <h2 className="m-0 text-center text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-extrabold tracking-h2 text-charcoal-800 text-balance">
                {c.compare.h2}
              </h2>
              <div className="border border-charcoal-100 rounded-2xl overflow-hidden">
                <table className="w-full border-collapse table-fixed text-[15px]">
                  <colgroup>
                    <col className="w-[44%]" />
                    <col className="w-[28%]" />
                    <col className="w-[28%]" />
                  </colgroup>
                  <thead className="bg-charcoal-50 text-sm font-bold">
                    <tr>
                      <th scope="col" className="px-5 py-4"><span className="sr-only">{c.compare.criterion}</span></th>
                      <th scope="col" className="px-3 py-4 text-center text-primary-700 bg-primary-50">{c.compare.us}</th>
                      <th scope="col" className="px-3 py-4 text-center text-charcoal-400">{c.compare.them}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.compare.rows.map((row) => (
                      <tr key={row.label} className="border-t border-charcoal-100">
                        <th scope="row" className="px-5 max-sm:px-3 py-4 text-left font-semibold text-charcoal-800">{row.label}</th>
                        <td className="px-3 py-4 text-center font-extrabold text-primary-700 bg-primary-50">{row.us}</td>
                        <td className="px-3 py-4 text-center text-charcoal-400">{row.them}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── 06 FAQ ── */}
          <section id="faq" className={`${SECTION_X} ${SECTION_Y} bg-charcoal-50 scroll-mt-24`}>
            <div className="mx-auto max-w-[820px] flex flex-col gap-8">
              <h2 className="m-0 text-[clamp(28px,3.2vw,40px)] leading-[1.1] font-extrabold tracking-h2 text-charcoal-800">
                {c.faq.h2}
              </h2>
              <FaqAccordion items={c.faq.items} />
            </div>
          </section>

          {/* ── 07 CTA final ── */}
          <section className={`${SECTION_X} py-[clamp(56px,7vw,96px)]`}>
            <div className="relative mx-auto max-w-[1240px] rounded-[20px] overflow-hidden bg-primary-800">
              <Image
                src="/images/devenir-hote/chalet-soiree.jpg"
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 1240px) 100vw, 1240px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(21,24,13,0.85)] via-[rgba(21,24,13,0.55)] via-60% to-[rgba(21,24,13,0.3)]" />
              <div className="relative p-[clamp(40px,6vw,88px)] flex flex-col gap-[22px] max-w-[680px]">
                <h2 className="m-0 text-[clamp(34px,4.4vw,56px)] leading-[1.04] font-extrabold tracking-display text-white text-balance">
                  {c.finalCta.h2}
                </h2>
                <p className="m-0 text-lg leading-[1.55] text-white/90">{c.finalCta.subtitle}</p>
                <div className="flex flex-wrap gap-3">
                  <ScrollToImportButton
                    emplacement="cta_final"
                    className={`inline-flex items-center justify-center h-14 px-[26px] rounded-full bg-white text-primary-800 text-base font-extrabold hover:bg-primary-50 ${BTN_MOTION}`}
                  >
                    {c.finalCta.importBtn}
                  </ScrollToImportButton>
                  <CreateListingLink
                    emplacement="cta_final"
                    className={`inline-flex items-center justify-center h-14 px-6 rounded-full border-[1.5px] border-white bg-[rgba(21,24,13,0.35)] text-white text-base font-bold whitespace-nowrap hover:bg-white/10 ${BTN_MOTION}`}
                  >
                    {c.finalCta.createBtn}
                  </CreateListingLink>
                </div>
                <p className="m-0 text-sm text-white/80">{c.finalCta.reassurance}</p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        {/* Espace pour que la barre fixe mobile ne cache pas le bas du pied de page */}
        <div className="h-[76px] min-[760px]:hidden" aria-hidden="true" />
        <StickyCta c={c.sticky} />
      </div>
    </OwnerAccessProvider>
  );
}

const FEATURE_ICONS = [
  "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
];

function HeroListingCard({ locale, pill }: { locale: string; pill: string }) {
  const l = HERO_LISTING;
  const isEn = locale === "en";
  const href = buildListingPath(l, isEn ? "en" : "fr") ?? localePath("/chalets", locale);
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-charcoal-100 mb-3">
        <Image
          src={l.photo}
          alt={isEn ? "Chalet Authentik 50 in Mille-Isles" : "Chalet Authentik 50 à Mille-Isles"}
          fill
          loading="lazy"
          sizes="(min-width: 1024px) 480px, 1px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute top-3.5 left-3.5 bg-white text-charcoal-800 text-xs font-bold px-2.5 py-1.5 rounded-full shadow-[var(--shadow-sm)]">
          {pill}
        </span>
        <span className="absolute top-3 right-3 w-[38px] h-[38px] rounded-full bg-white/90 flex items-center justify-center" aria-hidden="true">
          <svg className="w-[18px] h-[18px] text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </span>
      </div>
      <div className="px-1.5">
        <p className="m-0 font-semibold text-base text-charcoal-800 leading-snug truncate mb-1">{l.title}</p>
        <p className="m-0 text-sm text-charcoal-400 mb-2">
          {l.city} · {l.capacity} {isEn ? "travelers" : "voyageurs"} · {l.bedrooms} {isEn ? "bedrooms" : "chambres"}
        </p>
        <p className="m-0 text-sm font-semibold text-charcoal-800">
          {formatPrice(l.price, locale)} <span className="text-charcoal-400">{isEn ? "/night" : "/nuit"}</span>
        </p>
      </div>
    </Link>
  );
}
