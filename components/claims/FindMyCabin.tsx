"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { localePath } from "@/lib/localePath";
import { loadMunicipalities } from "@/lib/loadMunicipalities";
import { rankDestinations, resolveDestination, type DestCandidate, type DestItem } from "@/lib/destinationSearch";
import type { Municipality } from "@/lib/municipalities";
import type { UnclaimedMatch } from "@/lib/claims/lookup";
import ClaimChoice from "@/components/claims/ClaimChoice";
import { CreateListingLink, NEW_LISTING_PATH, OwnerAccessProvider } from "@/components/devenir-hote/OwnerAccess";

// Page publique « Trouver mon chalet » (sans compte) : le proprio entre sa ville (noms officiels des
// municipalités, tolérant aux accents et aux fautes), voit les fiches non revendiquées de cette ville et
// lance la revendication. Si son chalet n'y est pas, « Créer mon annonce ».
export default function FindMyCabin({
  city,
  matches,
  signedIn,
  locale,
}: {
  city: string | null;
  matches: UnclaimedMatch[];
  signedIn: boolean;
  locale: string;
}) {
  return (
    <OwnerAccessProvider>
      <FindMyCabinInner city={city} matches={matches} signedIn={signedIn} locale={locale} />
    </OwnerAccessProvider>
  );
}

function FindMyCabinInner({
  city,
  matches,
  signedIn,
  locale,
}: {
  city: string | null;
  matches: UnclaimedMatch[];
  signedIn: boolean;
  locale: string;
}) {
  const t = useTranslations("claim");
  const router = useRouter();
  const basePath = localePath("/trouver-mon-chalet", locale);
  const [claiming, setClaiming] = useState<UnclaimedMatch | null>(null);

  return (
    <div>
      <p className="text-sm text-charcoal-500">{t("findEyebrow")}</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-charcoal-800">{t("findTitle")}</h1>
      <p className="mt-3 text-base text-charcoal-600 max-w-xl">{t("findIntro")}</p>

      <CitySearch initialCity={city ?? ""} onPick={(slug) => router.push(`${basePath}?ville=${encodeURIComponent(slug)}`)} />

      {city && (
        <section className="mt-12" aria-live="polite">
          {matches.length > 0 ? (
            <>
              <h2 className="text-heading-2 font-semibold tracking-h2 text-charcoal-800">
                {matches.length === 1 ? t("findResultsOne", { city }) : t("findResultsMany", { count: matches.length, city })}
              </h2>
              <p className="mt-2 text-base text-charcoal-600">{t("findResultsHint")}</p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {matches.map((m) => (
                  <li key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#ebebeb] bg-white">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt="" loading="lazy" className="h-48 w-full object-cover" />
                    ) : (
                      <div className="h-48 w-full bg-charcoal-100" />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-base font-semibold text-charcoal-800 line-clamp-2">{m.title}</p>
                      <p className="mt-1 text-sm text-charcoal-500">{[city, t("notActivated")].filter(Boolean).join(" · ")}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <button
                          type="button"
                          onClick={() => setClaiming(m)}
                          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                        >
                          {t("findClaim")}
                        </button>
                        {m.path && (
                          <a
                            href={m.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-dark"
                          >
                            {t("findViewListing")}
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-heading-2 font-semibold tracking-h2 text-charcoal-800">{t("findNoneTitle", { city })}</h2>
              <p className="mt-2 text-base text-charcoal-600">{t("findNoneBody")}</p>
            </>
          )}

          <div className="mt-10 rounded-2xl bg-charcoal-50 p-6 sm:p-8">
            <h2 className="text-heading-3 font-semibold text-charcoal-800">{t("findMissingTitle")}</h2>
            <p className="mt-2 text-base text-charcoal-600">{t("findMissingBody")}</p>
            <CreateListingLink
              emplacement="trouver_resultats"
              target={`${NEW_LISTING_PATH}?verifie=1`}
              className="mt-5 inline-flex items-center justify-center min-h-12 rounded-full bg-primary px-6 py-3 text-base font-bold text-white hover:bg-primary-dark transition-colors"
            >
              {t("findCreate")}
            </CreateListingLink>
          </div>
        </section>
      )}

      {claiming && (
        <ClaimDialog match={claiming} signedIn={signedIn} locale={locale} onClose={() => setClaiming(null)} />
      )}
    </div>
  );
}

function ClaimDialog({
  match,
  signedIn,
  locale,
  onClose,
}: {
  match: UnclaimedMatch;
  signedIn: boolean;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations("claim");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-claim-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <h3 id="find-claim-title" className="text-heading-3 font-semibold text-charcoal-800">{t("dialogTitle")}</h3>
        <p className="mt-1 text-sm text-charcoal-500">{match.title}</p>
        <p className="mt-3 text-base text-charcoal-600">{t("dialogIntro")}</p>
        <div className="mt-6">
          <ClaimChoice listingId={match.id} maskedEmail={match.maskedEmail} locale={locale} signedIn={signedIn} />
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ebebeb] bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-700 hover:bg-charcoal-50 transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Champ « Ville » : propositions tirées de la liste officielle des municipalités (la même que la barre de
// recherche des chalets), jamais de ville inventée. Fautes de frappe : « Vouliez-vous dire… ».
function CitySearch({ initialCity, onPick }: { initialCity: string; onPick: (slug: string) => void }) {
  const t = useTranslations("claim");
  const [municipalities, setMunicipalities] = useState<Municipality[] | null>(null);
  const [input, setInput] = useState(initialCity);
  const [open, setOpen] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = () => { void loadMunicipalities().then(setMunicipalities); };

  const candidates = useMemo<DestCandidate[]>(
    () =>
      (municipalities ?? []).map((m) => ({
        item: { label: m.name, type: "city", value: m.slug } satisfies DestItem,
        names: [m.name],
      })),
    [municipalities]
  );
  const ranked = useMemo(
    () => rankDestinations(input, [], candidates, { regions: 0, cities: 6 }),
    [input, candidates]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(item: DestItem) {
    setInput(item.label);
    setOpen(false);
    setUnknown(false);
    onPick(item.value);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = resolveDestination(ranked);
    if (chosen) return pick(chosen);
    setUnknown(true);
    setOpen(true);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 max-w-xl">
      <label htmlFor="find-city" className="block text-sm font-semibold text-charcoal-800">{t("findLabel")}</label>
      <div ref={wrapRef} className="relative mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            id="find-city"
            type="text"
            role="combobox"
            aria-expanded={open && ranked.items.length > 0}
            aria-controls="find-city-list"
            autoComplete="off"
            value={input}
            onFocus={() => { load(); setOpen(true); }}
            onChange={(e) => { load(); setInput(e.target.value); setUnknown(false); setOpen(true); }}
            placeholder={t("findPlaceholder")}
            className="w-full rounded-xl border border-[#d6d6d6] px-4 py-3.5 text-base text-charcoal-800 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {open && ranked.items.length > 0 && (
            <ul
              id="find-city-list"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#ebebeb] bg-white shadow-[var(--shadow-md)]"
            >
              {ranked.fuzzy && <li className="px-4 pt-3 text-sm text-charcoal-500">{t("findDidYouMean")}</li>}
              {ranked.items.map((item) => (
                <li key={item.value} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="block w-full px-4 py-3 text-left text-base text-charcoal-800 hover:bg-charcoal-50"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {t("findButton")}
        </button>
      </div>
      {unknown && <p className="mt-3 text-sm text-error-600" role="alert">{t("findUnknown")}</p>}
    </form>
  );
}
