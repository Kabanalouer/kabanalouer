import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getTranslations, getLocale } from "next-intl/server";
import { localePath } from "@/lib/localePath";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("privacy"), getLocale()]);
  const canonical = locale === "en" ? "/en/privacy" : "/confidentialite";
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    alternates: { canonical },
    openGraph: { title: t("metaTitle"), description: t("metaDesc"), url: canonical },
  };
}

export default async function ConfidentialitePage() {
  const [t, locale] = await Promise.all([getTranslations("privacy"), getLocale()]);

  const TOC = [
    { id: "responsable", label: t("toc1") },
    { id: "donnees-collectees", label: t("toc2") },
    { id: "utilisation", label: t("toc3") },
    { id: "partage", label: t("toc4") },
    { id: "droits", label: t("toc5") },
    { id: "conservation", label: t("toc6") },
    { id: "cookies", label: t("toc7") },
    { id: "securite", label: t("toc8") },
    { id: "modifications", label: t("toc9") },
    { id: "contact", label: t("toc10") },
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
          <section id="responsable" className="scroll-mt-24">
            <H2>{t("s1Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s1P1")}</p>
              <p>
                {t("s1P2")}{" "}
                <a href="mailto:support@kabanalouer.ca" className="text-primary hover:underline">
                  support@kabanalouer.ca
                </a>
              </p>
            </div>
          </section>

          {/* 2 */}
          <section id="donnees-collectees" className="scroll-mt-24">
            <H2>{t("s2Title")}</H2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>{t("s2Intro")}</p>
              <div>
                <p className="font-semibold text-charcoal-800 mb-2">{t("s2CatReg")}</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>{t("s2RegI1")}</li>
                  <li>{t("s2RegI2")}</li>
                  <li>{t("s2RegI3")}</li>
                  <li>{t("s2RegI4")}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-charcoal-800 mb-2">{t("s2CatListing")}</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>{t("s2ListI1")}</li>
                  <li>{t("s2ListI2")}</li>
                  <li>{t("s2ListI3")}</li>
                  <li>{t("s2ListI4")}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-charcoal-800 mb-2">{t("s2CatNav")}</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>{t("s2NavI1")}</li>
                  <li>{t("s2NavI2")}</li>
                  <li>{t("s2NavI3")}</li>
                  <li>{t("s2NavI4")}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-charcoal-800 mb-2">{t("s2CatMsg")}</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>{t("s2MsgI1")}</li>
                  <li>{t("s2MsgI2")}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-charcoal-800 mb-2">{t("s2CatPay")}</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-charcoal-600">
                  <li>{t("s2PayI1")}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section id="utilisation" className="scroll-mt-24">
            <H2>{t("s3Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s3Intro")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s3I1")}</li>
                <li>{t("s3I2")}</li>
                <li>{t("s3I3")}</li>
                <li>{t("s3I4")}</li>
                <li>{t("s3I5")}</li>
                <li>{t("s3I6")}</li>
                <li>{t("s3I7")}</li>
              </ul>
              <p>{t("s3P2")}</p>
            </div>
          </section>

          {/* 4 */}
          <section id="partage" className="scroll-mt-24">
            <H2>{t("s4Title")}</H2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>{t("s4P1")}</p>
              <ul className="space-y-3">
                <LegalItem term={t("s4T1")}>{t("s4D1")}</LegalItem>
                <LegalItem term={t("s4T2")}>{t("s4D2")}</LegalItem>
                <LegalItem term={t("s4T3")}>{t("s4D3")}</LegalItem>
                <LegalItem term={t("s4T4")}>{t("s4D4")}</LegalItem>
                <LegalItem term={t("s4T5")}>{t("s4D5")}</LegalItem>
              </ul>
              <p>{t("s4P2")}</p>
            </div>
          </section>

          {/* 5 */}
          <section id="droits" className="scroll-mt-24">
            <H2>{t("s5Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s5P1")}</p>
              <ul className="space-y-3">
                <LegalItem term={t("s5T1")}>{t("s5D1")}</LegalItem>
                <LegalItem term={t("s5T2")}>{t("s5D2")}</LegalItem>
                <LegalItem term={t("s5T3")}>{t("s5D3")}</LegalItem>
                <LegalItem term={t("s5T4")}>{t("s5D4")}</LegalItem>
                <LegalItem term={t("s5T5")}>{t("s5D5")}</LegalItem>
                <LegalItem term={t("s5T6")}>{t("s5D6")}</LegalItem>
              </ul>
              <p>{t("s5P2")}</p>
            </div>
          </section>

          {/* 6 */}
          <section id="conservation" className="scroll-mt-24">
            <H2>{t("s6Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <ul className="space-y-3">
                <LegalItem term={t("s6T1")}>{t("s6D1")}</LegalItem>
                <LegalItem term={t("s6T2")}>{t("s6D2")}</LegalItem>
                <LegalItem term={t("s6T3")}>{t("s6D3")}</LegalItem>
                <LegalItem term={t("s6T4")}>{t("s6D4")}</LegalItem>
                <LegalItem term={t("s6T5")}>{t("s6D5")}</LegalItem>
              </ul>
            </div>
          </section>

          {/* 7 */}
          <section id="cookies" className="scroll-mt-24">
            <H2>{t("s7Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s7Intro")}</p>
              <ul className="space-y-3">
                <LegalItem term={t("s7T1")}>{t("s7D1")}</LegalItem>
                <LegalItem term={t("s7T2")}>{t("s7D2")}</LegalItem>
              </ul>
              <p>{t("s7P2")}</p>
            </div>
          </section>

          {/* 8 */}
          <section id="securite" className="scroll-mt-24">
            <H2>{t("s8Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s8P1")}</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>{t("s8I1")}</li>
                <li>{t("s8I2")}</li>
                <li>{t("s8I3")}</li>
                <li>{t("s8I4")}</li>
                <li>{t("s8I5")}</li>
              </ul>
              <p>{t("s8P2")}</p>
            </div>
          </section>

          {/* 9 */}
          <section id="modifications" className="scroll-mt-24">
            <H2>{t("s9Title")}</H2>
            <p className="text-sm leading-relaxed">{t("s9P1")}</p>
          </section>

          {/* 10 */}
          <section id="contact" className="scroll-mt-24">
            <H2>{t("s10Title")}</H2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t("s10P1")}</p>
              <p>
                <a href="mailto:support@kabanalouer.ca" className="text-primary hover:underline">
                  support@kabanalouer.ca
                </a>
              </p>
              <p>{t("s10P2")}</p>
            </div>
          </section>

        </div>

        {/* Back links */}
        <div className="mt-16 pt-8 border-t border-[#ebebeb] flex flex-col sm:flex-row gap-3">
          <Link href={localePath("/conditions", locale)} className="text-sm text-primary hover:underline">
            {t("backTerms")}
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
