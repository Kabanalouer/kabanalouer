"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ClaimChoice from "@/components/claims/ClaimChoice";
import type { UnclaimedMatch } from "@/lib/claims/lookup";

type Stage = "input" | "found" | "none" | "activate";

// Étape facultative au début de « Inscrire mon chalet » : un seul champ (CITQ). Si des fiches non
// activées le portent, le proprio peut les activer au lieu de créer un doublon ; sinon il crée son
// annonce. Rien ne bloque : « Passer cette étape » est toujours visible.
export default function ExistingListingCheck({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations("claim");
  const locale = useLocale();
  const [stage, setStage] = useState<Stage>("input");
  const [citq, setCitq] = useState("");
  const [matches, setMatches] = useState<UnclaimedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const value = citq.replace(/\s/g, "");
    if (!/^\d{6}$/.test(value)) {
      setError(t("checkInvalid"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/claims/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citq: value }),
      });
      if (!res.ok) throw new Error("lookup");
      const data = (await res.json()) as { matches: UnclaimedMatch[] };
      setMatches(data.matches);
      setStage(data.matches.length > 0 ? "found" : "none");
    } catch {
      setError(t("checkError"));
    } finally {
      setLoading(false);
    }
  }

  const primary =
    "w-full inline-flex items-center justify-center rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-60";
  const secondary =
    "w-full inline-flex items-center justify-center rounded-full border border-[#d6d6d6] bg-white px-6 py-3.5 text-base font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors";
  const textLink = "mt-5 block w-full text-center text-base text-primary underline underline-offset-4 hover:text-primary-dark";

  return (
    <div className="max-w-lg">
      <p className="text-sm text-charcoal-500">{t("checkEyebrow")}</p>

      {stage === "input" && (
        <form onSubmit={check} noValidate>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-charcoal-800">{t("checkTitle")}</h1>
          <p className="mt-2 text-base text-charcoal-600">{t("checkIntro")}</p>
          <label htmlFor="citq-check" className="sr-only">{t("checkLabel")}</label>
          <input
            id="citq-check"
            inputMode="numeric"
            autoComplete="off"
            maxLength={7}
            value={citq}
            onChange={(e) => setCitq(e.target.value.replace(/[^\d\s]/g, ""))}
            placeholder={t("checkPlaceholder")}
            className="mt-6 w-full rounded-xl border border-[#d6d6d6] px-4 py-3.5 text-xl tracking-[0.2em] text-charcoal-800 placeholder:text-charcoal-400 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {error && <p className="mt-3 text-sm text-error-600" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className={`${primary} mt-4`}>
            {loading ? t("checking") : t("checkButton")}
          </button>
          <button type="button" onClick={onContinue} className={textLink}>
            {t("checkSkip")}
          </button>
        </form>
      )}

      {stage === "found" && (
        <div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-charcoal-800">
            {t("foundTitle", { count: matches.length })}
          </h1>
          <p className="mt-2 text-base text-charcoal-600">
            {t(matches.length === 1 ? "foundIntroOne" : "foundIntroMany", { citq: citq.replace(/\s/g, "") })}
          </p>
          <ul className="mt-6 space-y-3">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center gap-4 rounded-2xl border border-[#ebebeb] p-3">
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt="" className="h-[72px] w-24 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-[72px] w-24 shrink-0 rounded-xl bg-charcoal-100" />
                )}
                <div className="min-w-0">
                  <p className="text-base font-semibold text-charcoal-800 line-clamp-2">{m.title}</p>
                  <p className="text-sm text-charcoal-500">{[m.city, t("notActivated")].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setStage("activate")} className={`${primary} mt-6`}>
            {matches.length === 1 ? t("activateOne") : t("activateMany", { count: matches.length })}
          </button>
          <button type="button" onClick={onContinue} className={`${secondary} mt-3`}>
            {t("notMine")}
          </button>
        </div>
      )}

      {stage === "activate" && (
        <div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-charcoal-800">{t("dialogTitle")}</h1>
          <p className="mt-2 text-base text-charcoal-600">{t("dialogIntro")}</p>
          <div className="mt-6">
            <ClaimChoice listingId={matches[0].id} maskedEmail={matches[0].maskedEmail} locale={locale} />
          </div>
          <button type="button" onClick={() => setStage("found")} className={textLink}>
            {t("back")}
          </button>
        </div>
      )}

      {stage === "none" && (
        <div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-charcoal-800">{t("noneTitle")}</h1>
          <p className="mt-2 text-base text-charcoal-600">{t("noneIntro")}</p>
          <button type="button" onClick={onContinue} className={`${primary} mt-6`}>
            {t("noneButton")}
          </button>
        </div>
      )}
    </div>
  );
}
