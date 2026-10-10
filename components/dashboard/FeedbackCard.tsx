"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

// Bas de chaque page du tableau de bord proprio : « Une idée ou un problème ? »
// → fenêtre de saisie → /api/feedback (Admin → Retours des proprios).
// S'ouvre aussi depuis le menu du proprio (lien vers /dashboard?retour=1).

type Kind = "probleme" | "idee" | "autre";

// true dans le navigateur seulement : la fenêtre passe par un portail vers
// document.body, qui n'existe pas au rendu serveur (ouverture par ?retour=1).
const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
const KINDS: Kind[] = ["probleme", "idee", "autre"];

export default function FeedbackCard() {
  const t = useTranslations("feedback");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [manualOpen, setManualOpen] = useState(false);
  // Ouverte aussi par le lien du menu (?retour=1), retiré de l'adresse à la fermeture.
  const openedByLink = searchParams.get("retour") === "1";
  const isClient = useIsClient();
  const open = isClient && (manualOpen || openedByLink);
  const [kind, setKind] = useState<Kind>("probleme");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setManualOpen(false);
    if (openedByLink) router.replace(pathname, { scroll: false });
    if (state === "sent") {
      setState("idle");
      setMessage("");
      setKind("probleme");
    }
    setError("");
  }

  async function submit() {
    if (!message.trim()) {
      setError(t("errorEmpty"));
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: message.trim(), page: pathname }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      setError(res.status === 429 ? t("errorTooMany") : t("errorGeneric"));
    } catch {
      setError(t("errorGeneric"));
    }
    setState("idle");
  }

  const placeholder =
    kind === "probleme" ? t("messagePlaceholderProbleme") : kind === "idee" ? t("messagePlaceholderIdee") : t("messagePlaceholderAutre");

  return (
    <>
      <section className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#ebebeb] bg-white p-5">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-charcoal-800">{t("cardTitle")}</h2>
          <p className="mt-1 text-sm text-charcoal-500">{t("cardBody")}</p>
        </div>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="self-start sm:self-auto shrink-0 rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-[#f5f6ec] transition-colors"
        >
          {t("cardCta")}
        </button>
      </section>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6">
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-charcoal-500 hover:bg-charcoal-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {state === "sent" ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p id="feedback-title" className="text-heading-3 font-semibold text-charcoal-800">{t("thanksTitle")}</p>
                  <p className="mt-2 text-sm text-charcoal-500">{t("thanksBody")}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                  >
                    {t("close")}
                  </button>
                </div>
              ) : (
                <>
                  <h2 id="feedback-title" className="pr-10 text-heading-3 font-semibold text-charcoal-800">{t("modalTitle")}</h2>

                  <p className="mt-5 text-sm font-medium text-charcoal-700">{t("kindLabel")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        aria-pressed={kind === k}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          kind === k ? "border-primary bg-[#f5f6ec] text-primary" : "border-[#ebebeb] text-charcoal-600 hover:border-charcoal-400"
                        }`}
                      >
                        {t(k === "probleme" ? "kindProbleme" : k === "idee" ? "kindIdee" : "kindAutre")}
                      </button>
                    ))}
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-medium text-charcoal-700">{t("messageLabel")}</span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
                      rows={5}
                      placeholder={placeholder}
                      className="mt-2 w-full rounded-xl border border-[#ebebeb] px-4 py-3 text-base text-charcoal-800 placeholder:text-charcoal-400 focus:border-primary focus:outline-none"
                    />
                  </label>

                  {error && <p className="mt-2 text-sm text-error-600">{error}</p>}

                  <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-full border border-[#ebebeb] bg-white px-5 py-2.5 text-sm font-medium text-charcoal-700 hover:border-charcoal-400 transition-colors"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={state === "sending"}
                      className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
                    >
                      {state === "sending" ? t("sending") : t("send")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
