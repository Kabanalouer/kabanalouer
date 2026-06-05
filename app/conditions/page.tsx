import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getTranslations, getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("terms"), getLocale()]);
  const canonical = locale === "en" ? "/en/terms" : "/conditions";
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: { canonical },
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), url: canonical },
  };
}

export default async function ConditionsPage() {
  const [t, locale] = await Promise.all([getTranslations("terms"), getLocale()]);

  const TOC = [
    { id: "definitions", label: t("toc1") },
    { id: "service", label: t("toc2") },
    { id: "inscription", label: t("toc3") },
    { id: "hotes", label: t("toc4") },
    { id: "voyageurs", label: t("toc5") },
    { id: "abonnement", label: t("toc6") },
    { id: "contenu-interdit", label: t("toc7") },
    { id: "propriete-intellectuelle", label: t("toc8") },
    { id: "responsabilite", label: t("toc9") },
    { id: "resiliation", label: t("toc10") },
    { id: "droit", label: t("toc11") },
    { id: "contact", label: t("toc12") },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full flex-1">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-charcoal-400 uppercase tracking-widest mb-2">{t("label")}</p>
          <h1 className="text-3xl font-bold text-charcoal-800 mb-3">{t("h1")}</h1>
          <p className="text-sm text-charcoal-400">{t("updated")}</p>
        </div>

        {/* Table of contents */}
        <nav className="bg-charcoal-50 rounded-2xl p-6 mb-12 border border-[#ebebeb]">
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-4">
            {t("tocTitle")}
          </p>
          <ol className="space-y-2">
            {TOC.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className="text-sm text-primary hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Intro */}
        <p className="text-charcoal-600 leading-relaxed mb-10">{t("intro")}</p>

        <div className="space-y-12 text-charcoal-700">

          {/* 1 */}
          <section id="definitions" className="scroll-mt-24">
            <H2>{t("s1Title")}</H2>
            <ul className="space-y-2 text-sm leading-relaxed">
              <LegalItem term={t("s1T1")}>{t("s1D1")}</LegalItem>
              <LegalItem term={t("s1T2")}>{t("s1D2")}</LegalItem>
              <LegalItem term={t("s1T3")}>{t("s1D3")}</LegalItem>
              <LegalItem term={t("s1T4")}>{t("s1D4")}</LegalItem>
              <LegalItem term={t("s1T5")}>{t("s1D5")}</LegalItem>
            </ul>
          </section>

          {/* 2 */}
          <section id="service" className="scroll-mt-24">
            <H2>{t("s2Title")}</H2>
            <p className="text-sm leading-relaxed">{t("s2P1")}</p>
          </section>

          {/* 3 */}
          <section id="inscription" className="scroll-mt-24">
            <H2>{t("s3Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s3P1")}</p>
              <p>{t("s3P2")}</p>
              <p>{t("s3P3")}</p>
            </div>
          </section>

          {/* 4 */}
          <section id="hotes" className="scroll-mt-24">
            <H2>{t("s4Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s4Intro")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s4I1")}</li>
                <li>{t("s4I2")}</li>
                <li>{t("s4I3")}</li>
                <li>{t("s4I4")}</li>
                <li>{t("s4I5")}</li>
                <li>{t("s4I6")}</li>
              </ul>
            </div>
          </section>

          {/* 5 */}
          <section id="voyageurs" className="scroll-mt-24">
            <H2>{t("s5Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s5Intro")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s5I1")}</li>
                <li>{t("s5I2")}</li>
                <li>{t("s5I3")}</li>
                <li>{t("s5I4")}</li>
              </ul>
            </div>
          </section>

          {/* 6 */}
          <section id="abonnement" className="scroll-mt-24">
            <H2>{t("s6Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s6P1")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s6I1")}</li>
                <li>{t("s6I2")}</li>
                <li><strong>{t("s6I3")}</strong></li>
                <li>{t("s6I4")}</li>
                <li>{t("s6I5")}</li>
              </ul>
            </div>
          </section>

          {/* 7 */}
          <section id="contenu-interdit" className="scroll-mt-24">
            <H2>{t("s7Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s7Intro")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s7I1")}</li>
                <li>{t("s7I2")}</li>
                <li>{t("s7I3")}</li>
                <li>{t("s7I4")}</li>
                <li>{t("s7I5")}</li>
              </ul>
              <p>{t("s7P2")}</p>
            </div>
          </section>

          {/* 8 */}
          <section id="propriete-intellectuelle" className="scroll-mt-24">
            <H2>{t("s8Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s8P1")}</p>
              <p>{t("s8P2")}</p>
              <p>{t("s8P3")}</p>
            </div>
          </section>

          {/* 9 */}
          <section id="responsabilite" className="scroll-mt-24">
            <H2>{t("s9Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s9P1")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s9I1")}</li>
                <li>{t("s9I2")}</li>
                <li>{t("s9I3")}</li>
                <li>{t("s9I4")}</li>
              </ul>
              <p>{t("s9P2")}</p>
            </div>
          </section>

          {/* 10 */}
          <section id="resiliation" className="scroll-mt-24">
            <H2>{t("s10Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s10P1")}</p>
              <p>{t("s10P2")}</p>
            </div>
          </section>

          {/* 11 */}
          <section id="droit" className="scroll-mt-24">
            <H2>{t("s11Title")}</H2>
            <p className="text-sm leading-relaxed">{t("s11P1")}</p>
          </section>

          {/* 12 */}
          <section id="contact" className="scroll-mt-24">
            <H2>{t("s12Title")}</H2>
            <p className="text-sm leading-relaxed">
              {t("s12P1")}{" "}
              <a href="mailto:support@kabanalouer.ca" className="text-primary hover:underline">
                support@kabanalouer.ca
              </a>
            </p>
          </section>

        </div>

        {/* Back links */}
        <div className="mt-16 pt-8 border-t border-[#ebebeb] flex flex-col sm:flex-row gap-3">
          <Link href={localePath("/confidentialite", locale)} className="text-sm text-primary hover:underline">
            {t("backPrivacy")}
          </Link>
          <Link href={localePath("/", locale)} className="text-sm text-charcoal-400 hover:text-charcoal-600">
            {t("backHome")}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-charcoal-800 mb-4 pb-2 border-b border-[#ebebeb]">
      {children}
    </h2>
  );
}

function LegalItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <li>
      <strong>{term} :</strong>{" "}
      <span className="text-charcoal-600">{children}</span>
    </li>
  );
}
