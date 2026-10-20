"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ClaimChoice from "@/components/claims/ClaimChoice";
import type { UnclaimedMatch } from "@/lib/claims/lookup";

// Tableau de bord : le courriel du compte est celui d'une ou plusieurs fiches non activées. Aucune
// saisie : un clic ouvre les deux façons d'activer (lien par courriel ou permis CITQ).
export default function UnclaimedMatchBanner({ matches }: { matches: UnclaimedMatch[] }) {
  const t = useTranslations("claim");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  if (matches.length === 0) return null;
  const count = matches.length;

  return (
    <div role="status" className="mb-8 rounded-2xl border border-primary/20 bg-[#f5f6ec] px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-base font-semibold text-charcoal-800">{t("bannerTitle", { count })}</p>
          <p className="mt-1 text-base text-charcoal-600">
            {matches.slice(0, 2).map((m) => m.title).filter(Boolean).join(", ")}
            {count > 2 ? ` ${t("bannerMore", { count: count - 2 })}` : ""}
            {". "}
            {t("bannerBody", { count })}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center justify-center bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
          >
            {t("bannerCta")}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-5 max-w-lg">
          <ClaimChoice listingId={matches[0].id} maskedEmail={matches[0].maskedEmail} locale={locale} />
        </div>
      )}
    </div>
  );
}
