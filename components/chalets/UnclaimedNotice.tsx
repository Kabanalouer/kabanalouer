"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { localePath } from "@/lib/localePath";

// Mention sobre sur la fiche d'un chalet non revendiqué + bouton « C'est mon
// chalet » : le propriétaire peut recevoir le lien d'activation à l'adresse
// qu'on a au dossier (option A) ou demander une vérification manuelle (option B).
export default function UnclaimedNotice({
  listingId,
  maskedEmail,
  locale,
  signedIn,
}: {
  listingId: string;
  maskedEmail: string | null;
  locale: string;
  signedIn: boolean;
}) {
  const t = useTranslations("claim");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Le lien « Revendiquer mon annonce » du bloc de demande de prix ouvre la même fenêtre
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("kbl:open-claim", onOpen);
    return () => window.removeEventListener("kbl:open-claim", onOpen);
  }, []);

  async function sendLink() {
    setState("sending");
    try {
      const res = await fetch("/api/claims/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, locale }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const verificationPath = `${localePath("/revendiquer/verification", locale)}?listing=${listingId}`;
  const loginHref = `${localePath("/login", locale)}?next=${encodeURIComponent(verificationPath)}`;

  return (
    <section className="bg-charcoal-50 rounded-2xl p-6 sm:p-8">
      <h2 className="text-heading-3 font-semibold text-charcoal-800">{t("noticeTitle")}</h2>
      <p className="mt-2 text-base text-charcoal-600">{t("noticeBody")}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center justify-center rounded-full border border-charcoal-300 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors"
      >
        {t("cta")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 id="claim-dialog-title" className="text-heading-3 font-semibold text-charcoal-800">{t("dialogTitle")}</h3>
            <p className="mt-2 text-base text-charcoal-600">{t("dialogIntro")}</p>

            {maskedEmail && (
              <div className="mt-6 rounded-xl border border-[#ebebeb] p-5">
                <p className="text-base font-semibold text-charcoal-800">{t("sendLinkTitle", { email: maskedEmail })}</p>
                <p className="mt-1 text-sm text-charcoal-500">{t("sendLinkBody")}</p>
                {state === "sent" ? (
                  <p className="mt-4 text-sm font-medium text-success-700" role="status">{t("sendLinkDone")}</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={sendLink}
                      disabled={state === "sending"}
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
                    >
                      {state === "sending" ? t("sending") : t("sendLinkButton")}
                    </button>
                    {state === "error" && (
                      <p className="mt-3 text-sm text-error-600" role="alert">{t("sendLinkError")}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#ebebeb] p-5">
              <p className="text-base font-semibold text-charcoal-800">{t("proofTitle")}</p>
              <p className="mt-1 text-sm text-charcoal-500">{t("proofBody")}</p>
              <a
                href={signedIn ? verificationPath : loginHref}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-charcoal-300 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors"
              >
                {signedIn ? t("proofButton") : t("proofButtonSignIn")}
              </a>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#ebebeb] bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-700 hover:bg-charcoal-50 transition-colors"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
