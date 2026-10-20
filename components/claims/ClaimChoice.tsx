"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { localePath } from "@/lib/localePath";

// Les deux façons d'activer une fiche, pour un proprio déjà connecté : lien envoyé à l'adresse qu'on a
// au dossier (option A, couvre toutes les fiches de cette adresse) ou vérification manuelle avec le
// permis CITQ (option B). Mêmes routes et mêmes textes que la fenêtre « C'est mon chalet » de la fiche
// publique (UnclaimedNotice) ; ici en panneau intégré à la page.
export default function ClaimChoice({
  listingId,
  maskedEmail,
  locale,
}: {
  listingId: string;
  maskedEmail: string | null;
  locale: string;
}) {
  const t = useTranslations("claim");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  return (
    <div className="space-y-4">
      {maskedEmail && (
        <div className="rounded-xl border border-[#ebebeb] bg-white p-5">
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
              {state === "error" && <p className="mt-3 text-sm text-error-600" role="alert">{t("sendLinkError")}</p>}
            </>
          )}
        </div>
      )}
      <div className="rounded-xl border border-[#ebebeb] bg-white p-5">
        <p className="text-base font-semibold text-charcoal-800">{t("proofTitle")}</p>
        <p className="mt-1 text-sm text-charcoal-500">{t("proofBodySignedIn")}</p>
        <a
          href={verificationPath}
          className="mt-4 inline-flex items-center justify-center rounded-full border border-charcoal-300 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors"
        >
          {t("proofButton")}
        </a>
      </div>
    </div>
  );
}
