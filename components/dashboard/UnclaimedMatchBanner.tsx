"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UnclaimedMatch } from "@/lib/claims/lookup";

// Tableau de bord : le courriel (confirmé) du compte est celui d'une ou plusieurs fiches non activées.
// Un seul bouton : l'adresse est la preuve, les fiches passent au compte et se mettent en ligne.
export default function UnclaimedMatchBanner({ matches }: { matches: UnclaimedMatch[] }) {
  const t = useTranslations("claim");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (matches.length === 0) return null;
  const count = matches.length;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claims/claim-mine", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? t("bannerError"));
        setBusy(false);
        return;
      }
      router.push("/dashboard/listings");
      router.refresh();
    } catch {
      setError(t("bannerError"));
      setBusy(false);
    }
  }

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
          {error && <p className="mt-2 text-sm text-error-600">{error}</p>}
        </div>
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="shrink-0 inline-flex items-center justify-center bg-action text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-action-hover transition-colors disabled:opacity-60"
        >
          {busy ? t("bannerBusy") : t("bannerCta", { count })}
        </button>
      </div>
    </div>
  );
}
