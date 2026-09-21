"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

// sessionStorage (pas localStorage) — même comportement que PhoneReminderBanner :
// le bandeau réapparaît à la prochaine visite tant que la photo et la bio ne
// sont pas complétées, fermer ne fait que le masquer pour l'onglet en cours.
const DISMISS_KEY = "profileCompletionDismissed";

export default function ProfileCompletionBanner({ show }: { show: boolean }) {
  const t = useTranslations("profileCompletionReminder");
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // Navigation privée / stockage bloqué — le bandeau reste affiché, sans plus.
    }
  }, []);

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3">
      <p className="text-sm text-charcoal-700">{t("message")}</p>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href={localePath("/dashboard/profile", locale)}
          className={`text-sm whitespace-nowrap ${TEXT_LINK_CLASSNAME}`}
        >
          {t("completeLink")}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="text-charcoal-400 hover:text-charcoal-600 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
