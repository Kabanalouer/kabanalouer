"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

// Même comportement que PhoneReminderBanner : sessionStorage, le bandeau
// revient à la prochaine visite tant qu'aucune photo n'a été ajoutée.
const DISMISS_KEY = "photoReminderDismissed";

export default function PhotoReminderBanner() {
  const t = useTranslations("photoReminder");
  const locale = useLocale();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    } catch {
      // Navigation privée / stockage bloqué — le bandeau reste affiché, sans plus.
    }
  }, []);

  if (hidden) return null;

  const handleDismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-charcoal-700">{t("bannerMessage")}</p>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href={localePath("/dashboard/profile", locale)}
          className={`text-sm whitespace-nowrap ${TEXT_LINK_CLASSNAME}`}
        >
          {t("addPhotoCta")}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="text-charcoal-400 hover:text-charcoal-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Rappel affiché juste après l'envoi d'un premier message ou d'une demande de
// prix — jamais avant, pour ne pas freiner la demande elle-même.
export function PhotoTip() {
  const t = useTranslations("photoReminder");
  const locale = useLocale();

  // Lien vers « Mon profil » plutôt qu'un envoi de fichier sur place : le
  // voyageur voit où se trouve sa photo et peut compléter le reste du profil.
  return (
    <div className="mt-5 rounded-xl bg-charcoal-50 border border-[#ebebeb] p-4 text-left">
      <p className="text-sm text-charcoal-700">{t("tipMessage")}</p>
      <Link href={localePath("/dashboard/profile", locale)} className={`mt-2 inline-block text-sm ${TEXT_LINK_CLASSNAME}`}>
        {t("tipCta")}
      </Link>
    </div>
  );
}
