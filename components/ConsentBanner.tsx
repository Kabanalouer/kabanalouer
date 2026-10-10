"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { localePath } from "@/lib/localePath";
import { onOpenConsentSettings, parseConsent, saveConsent, useConsentRaw } from "@/lib/consent";

// Bandeau de consentement (Loi 25) : petit encart en bas de l'écran, affiché
// tant que le visiteur n'a pas choisi, et rouvert par « Gérer mes cookies »
// (pied de page). « Refuser » aussi visible et aussi simple qu'« Accepter ».
// Une seule catégorie demandée pour l'instant (mesure d'audience) : ajouter
// la publicité ici quand le pixel Meta sera branché.
export default function ConsentBanner() {
  const t = useTranslations("consent");
  const locale = useLocale();
  const raw = useConsentRaw();
  const [reopened, setReopened] = useState(false);

  useEffect(() => onOpenConsentSettings(() => setReopened(true)), []);

  // raw === undefined : rendu serveur / avant lecture → rien (pas de flash)
  const visible = raw !== undefined && (reopened || parseConsent(raw) === null);
  if (!visible) return null;

  const choose = (mesure: boolean) => {
    saveConsent({ mesure, publicite: false });
    setReopened(false);
  };
  const button =
    "rounded-full border border-[#ebebeb] bg-white px-3.5 py-1.5 text-sm font-semibold text-charcoal-800 hover:border-charcoal-400 transition-colors";

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:left-4 sm:bottom-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#ebebeb] bg-white px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
    >
      <p className="text-sm text-charcoal-600">
        {t("text")}{" "}
        <Link href={`${localePath("/confidentialite", locale)}#cookies`} className="font-medium text-charcoal-800 underline underline-offset-2">
          {t("learnMore")}
        </Link>
      </p>
      <div className="flex gap-2 ml-auto">
        <button type="button" onClick={() => choose(false)} className={button}>
          {t("refuse")}
        </button>
        <button type="button" onClick={() => choose(true)} className={button}>
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
