"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { trackEvent } from "@/lib/analytics";
import { StandaloneCreateListingLink } from "@/components/devenir-hote/OwnerAccess";

// Bannière « Pour les proprios » de l'accueil (option 6a, 2026-11-27) : invite un propriétaire à retrouver sa fiche (déjà
// en ligne mais non revendiquée) par le nom de son chalet ou sa ville → /trouver-mon-chalet?q=… ; sinon « Créer mon annonce ».
// Les autres pages (recherche, régions, thèmes, /devenir-hote) gardent la bannière partagée components/OwnersBanner.tsx.
// Typographie : U+00A0 avant « % $ », U+202F avant « ? ». Le troisième chiffre n'est pas un délai : la validation par
// lien envoyé à l'adresse au dossier est rapide, mais la vérification manuelle (permis CITQ) dépend d'une approbation.

const TEXTS = {
  fr: {
    eyebrow: "Pour les proprios",
    title: "Votre chalet est peut-être déjà ici.",
    accent: "Réclamez-le.",
    pLong: "Trouvez votre fiche, validez-la et répondez aux voyageurs. Gratuit, sans commission sur vos réservations.",
    pShort: "Trouvez votre fiche, validez-la et répondez aux voyageurs. Gratuit, sans commission.",
    label: "Rechercher votre chalet par nom ou par ville",
    placeholder: "Nom de votre chalet ou ville",
    button: "Trouver mon chalet",
    notOnline: "Pas encore en ligne ?",
    create: "Créer mon annonce",
    stats: [
      { value: "0 %", long: "de commission", short: "commission" },
      { value: "0 $", long: "pour s’inscrire", short: "inscription" },
      { value: "Sans", long: "engagement", short: "engagement" },
    ],
  },
  en: {
    eyebrow: "For owners",
    title: "Your cabin may already be here.",
    accent: "Claim it.",
    pLong: "Find your listing, confirm it and reply to travellers. Free, with no commission on your bookings.",
    pShort: "Find your listing, confirm it and reply to travellers. Free, no commission.",
    label: "Search for your cabin by name or city",
    placeholder: "Your cabin’s name or city",
    button: "Find my cabin",
    notOnline: "Not online yet?",
    create: "Create my listing",
    stats: [
      { value: "0%", long: "commission", short: "commission" },
      { value: "$0", long: "to sign up", short: "sign-up" },
      { value: "No", long: "commitment", short: "commitment" },
    ],
  },
} as const;

export default function HomeOwnersBanner() {
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");
  const t = TEXTS[locale === "en" ? "en" : "fr"];
  const findPath = localePath("/trouver-mon-chalet", locale);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    trackEvent("owner_claim_search", { has_query: value.length > 0 });
    router.push(value ? `${findPath}?q=${encodeURIComponent(value)}` : findPath);
  };

  return (
    <section className="w-full bg-white px-[clamp(12px,2vw,24px)] py-[clamp(64px,8vw,112px)]">
      <div className="mx-auto max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[16px] bg-inverse sm:rounded-[var(--radius-hero)] lg:flex lg:min-h-[600px] lg:items-center">
          {/* Photo : bandeau de 200 px en haut sous 640 px, en fond de bannière ensuite */}
          <div className="relative h-[200px] sm:absolute sm:inset-0 sm:h-auto">
            <Image src="/images/devenir-hote/chalet-soiree.jpg" alt="" fill loading="lazy" sizes="100vw" className="object-cover" />
            <span className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-inverse),transparent_70%)] sm:hidden" aria-hidden="true" />
            <span className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(20,24,12,.94)_0%,rgba(20,24,12,.85)_70%,rgba(20,24,12,.5)_100%)] sm:block lg:hidden" aria-hidden="true" />
            <span className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(20,24,12,.94)_0%,rgba(20,24,12,.75)_50%,rgba(20,24,12,.15)_100%)] lg:block" aria-hidden="true" />
          </div>

          <div className="relative flex max-w-[700px] flex-col gap-[18px] px-5 pb-9 pt-2 sm:gap-6 sm:px-10 sm:py-14 lg:px-[72px] lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--fg-eyebrow-on-inverse)]">{t.eyebrow}</p>
            <h2 className="text-[34px] font-extrabold leading-[.98] tracking-[-0.045em] text-white text-balance sm:text-[length:clamp(40px,5vw,60px)]">
              {t.title.split("peut-être").flatMap((part, i, arr) =>
                i < arr.length - 1 ? [part, <span key={i} className="whitespace-nowrap">peut-être</span>] : [part]
              )}{" "}
              <span className="text-highlight">{t.accent}</span>
            </h2>
            <p className="max-w-[46ch] text-[15px] leading-[1.55] text-white/90 sm:text-lg sm:text-white/[.88]">
              <span className="sm:hidden">{t.pShort}</span>
              <span className="hidden sm:inline">{t.pLong}</span>
            </p>

            <div className="flex flex-col gap-3">
              <form
                role="search"
                action={findPath}
                method="get"
                onSubmit={onSubmit}
                className="flex max-w-[560px] flex-col gap-1.5 rounded-[16px] bg-white p-1.5 shadow-[0_24px_56px_rgba(0,0,0,.3)] focus-within:shadow-[var(--shadow-focus),0_24px_56px_rgba(0,0,0,.3)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-[var(--radius-pill)] sm:py-1.5 sm:pl-[22px] sm:pr-1.5"
              >
                <label htmlFor="home-owner-search" className="sr-only">{t.label}</label>
                <svg className="hidden h-[18px] w-[18px] shrink-0 text-charcoal-400 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="home-owner-search"
                  type="search"
                  name="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.placeholder}
                  autoComplete="off"
                  className="h-12 w-full min-w-0 bg-transparent px-3.5 text-[15px] text-charcoal-800 outline-none placeholder:text-charcoal-400 sm:h-auto sm:flex-1 sm:px-3"
                />
                <button
                  type="submit"
                  className="h-[52px] rounded-xl bg-action-on-dark px-6 text-base font-bold text-white transition-[background-color,transform] duration-[140ms] hover:bg-action active:scale-[.97] sm:h-auto sm:whitespace-nowrap sm:rounded-[var(--radius-pill)] sm:py-[15px] sm:text-[15px]"
                >
                  {t.button}
                </button>
              </form>
              <p className="text-[15px] text-white/[.88]">
                {t.notOnline}{" "}
                <StandaloneCreateListingLink emplacement="banniere_accueil" className="-my-3 inline-block py-3 font-bold text-white underline underline-offset-[3px]">
                  {t.create}
                </StandaloneCreateListingLink>
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-2 border-t border-white/[.16] pt-4 sm:flex sm:flex-wrap sm:gap-7">
              {t.stats.map((s) => (
                <div key={s.value + s.long}>
                  <dt className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-white sm:text-[32px]">{s.value}</dt>
                  <dd className="mt-1 text-xs text-[color:var(--fg-muted-on-inverse)] sm:text-sm">
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.long}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
