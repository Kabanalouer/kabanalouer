"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";

// Fiches importées en brouillon, revendiquées mais pas mises en ligne à la revendication (fiche à compléter ou
// abonnement à régler) : « Activer » pour une fiche ou pour toutes. Aucune confirmation des droits sur les
// photos ni du CITQ (décision de Simon, 2026-10-31) : le propriétaire ajoute son CITQ après la mise en ligne.
// POST /api/listings/activate-draft (lib/claims/activateDrafts.ts).

export type DraftToActivate = { id: string; title: string; city: string | null };

type ResultError = "not_eligible" | "incomplete" | "subscription_required" | "failed";
type ApiResult = { id: string; ok: boolean; error?: ResultError };

export default function DraftActivation({ drafts }: { drafts: DraftToActivate[] }) {
  const t = useTranslations("draftActivation");
  const router = useRouter();
  const [ids, setIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const open = ids !== null;
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setIds(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  if (drafts.length === 0 && !done) return null;

  const openFor = (list: string[]) => {
    setMessage(null);
    setErrors({});
    setIds(list);
  };

  const errorText = (e?: ResultError) =>
    e === "not_eligible" ? t("errNotEligible")
    : e === "incomplete" ? t("errIncomplete")
    : e === "subscription_required" ? t("errSubscription")
    : t("errFailed");

  const submit = async () => {
    if (!ids) return;
    setMessage(null);
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/listings/activate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: ids.map((id) => ({ id })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { results?: ApiResult[]; error?: string };
      if (!res.ok || !data.results) return setMessage(data.error ?? t("errGeneric"));

      const failed = data.results.filter((r) => !r.ok);
      for (const r of data.results) if (r.ok) trackEvent("listing_publish", { offer: "brouillon_active", listing_id: r.id });
      const okCount = data.results.length - failed.length;
      if (failed.length === 0) {
        setIds(null);
        setDone(t("done", { count: okCount }));
      } else {
        setErrors(Object.fromEntries(failed.map((r) => [r.id, errorText(r.error)])));
        setIds(failed.map((r) => r.id));
        setMessage(t("partial", { ok: okCount, failed: failed.length }));
      }
      router.refresh();
    } catch {
      setMessage(t("errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const draftOf = (id: string) => drafts.find((d) => d.id === id);

  return (
    <>
      {done && (
        <div role="status" className="mb-6 rounded-[16px] border border-success-100 bg-success-50 px-5 py-3 text-sm font-medium text-success-800">
          {done}
        </div>
      )}

      {drafts.length > 0 && (
        <section className="mb-6 rounded-[16px] border border-[#ebebeb] bg-[#f5f6ec] p-5 sm:p-6" aria-labelledby="draft-activation-title">
          <h2 id="draft-activation-title" className="text-heading-3 font-semibold text-charcoal-800">{t("bannerTitle", { count: drafts.length })}</h2>
          <p className="mt-1 text-sm text-charcoal-600">{t("bannerBody", { count: drafts.length })}</p>

          <ul className="mt-4 divide-y divide-[#ebebeb] rounded-xl border border-[#ebebeb] bg-white">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-charcoal-800">{d.title}</p>
                  {d.city && <p className="text-sm text-charcoal-500">{d.city}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => openFor([d.id])}
                  className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {t("activateOne")}
                </button>
              </li>
            ))}
          </ul>

          {drafts.length > 1 && (
            <button
              type="button"
              onClick={() => openFor(drafts.map((d) => d.id))}
              className="mt-4 rounded-full bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              {t("activateAll", { count: drafts.length })}
            </button>
          )}
        </section>
      )}

      {open && ids && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => !busy && setIds(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-activation-modal-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-6 sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="draft-activation-modal-title" className="text-heading-2 font-semibold text-charcoal-800">{t("modalTitle", { count: ids.length })}</h2>
            <p className="mt-2 text-sm text-charcoal-600">{t("modalIntro", { count: ids.length })}</p>

            {/* Erreurs par fiche (fiche à compléter, abonnement…) */}
            {Object.keys(errors).length > 0 && (
              <ul className="mt-4 space-y-1">
                {ids.filter((id) => errors[id]).map((id) => (
                  <li key={id} className="text-sm text-error-600">
                    <span className="font-semibold">{draftOf(id)?.title}</span> – {errors[id]}
                  </li>
                ))}
              </ul>
            )}

            {message && <p role="alert" className="mt-4 text-sm text-error-600">{message}</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIds(null)}
                disabled={busy}
                className="rounded-full border border-[#ebebeb] px-6 py-3 text-base font-semibold text-charcoal-700 transition-colors hover:bg-charcoal-50 disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {busy ? t("confirming") : t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
