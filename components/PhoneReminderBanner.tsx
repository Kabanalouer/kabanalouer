"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";

// sessionStorage (pas localStorage) — le bandeau doit réapparaître à la
// prochaine visite tant que le numéro n'a pas été ajouté, fermer ne fait
// que le masquer pour l'onglet en cours.
const DISMISS_KEY = "phoneReminderDismissed";

export default function PhoneReminderBanner({ show }: { show: boolean }) {
  const t = useTranslations("phoneReminder");
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
    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-charcoal-700">{t("message")}</p>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href={`${localePath("/dashboard/profile", locale)}#phone`}
          className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
        >
          {t("addLink")}
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
