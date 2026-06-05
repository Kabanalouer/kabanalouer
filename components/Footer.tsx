import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import FooterLangToggle from "./FooterLangToggle";

function FooterLogo() {
  return (
    <object
      type="image/svg+xml"
      data="/logo-wordmark.svg"
      aria-hidden="true"
      className="block h-[42px] w-auto pointer-events-none"
      style={{ width: 200, height: 42, marginLeft: -7 }}
    />
  );
}

function localePath(path: string, locale: string): string {
  return locale === "en" ? `/en${path}` : path;
}

export default async function Footer() {
  const [t, locale] = await Promise.all([getTranslations("footer"), getLocale()]);

  return (
    <footer className="w-full block bg-charcoal-50 border-t border-[#ebebeb]">
      <div className="px-6 lg:px-8 py-14">

        {/* ── Columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <FooterLogo />
            <p className="text-sm text-charcoal-400 leading-relaxed mt-4 max-w-xs">
              {t("brandDesc")}
            </p>
            <div className="mt-5">
              <FooterLangToggle />
            </div>
          </div>

          {/* Voyageurs / Travelers */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              {t("travelers.title")}
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href={localePath("/chalets", locale)} label={t("travelers.browse")} />
              <FooterLink href={localePath("/regions", locale)} label={t("travelers.regions")} />
              <FooterLink href={localePath("/comment-ca-marche", locale)} label={t("travelers.howItWorks")} />
            </ul>
          </div>

          {/* Proprios / Owners */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              {t("owners.title")}
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href={localePath("/devenir-hote", locale)} label={t("owners.listCabin")} />
              <FooterLink href={localePath("/devenir-hote", locale)} label={t("owners.whyChooseUs")} />
              <FooterLink href={localePath("/tarifs", locale)} label={t("owners.pricing")} />
              <FooterLink href={localePath("/faq-hotes", locale)} label={t("owners.faq")} />
            </ul>
          </div>

          {/* Légal / Legal */}
          <div>
            <h3 className="text-xs font-semibold text-charcoal-800 uppercase tracking-[0.08em] mb-4">
              {t("legal.title")}
            </h3>
            <ul className="space-y-3 text-sm">
              <FooterLink href={localePath("/a-propos", locale)} label={t("legal.about")} />
              <FooterLink href={localePath("/conditions", locale)} label={t("legal.terms")} />
              <FooterLink href={localePath("/confidentialite", locale)} label={t("legal.privacy")} />
              <FooterLink href={localePath("/contact", locale)} label={t("legal.contact")} />
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-[#ebebeb] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-charcoal-400">
            {t("copyright")}
          </p>
          <p className="text-xs text-charcoal-400">
            {t("madeWith")}{" "}
            <svg className="inline w-3.5 h-3.5 text-primary align-[-2px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {" "}{t("inQuebec")}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-charcoal-500 hover:text-charcoal-800 transition-colors"
      >
        {label}
      </Link>
    </li>
  );
}
