"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import FeedbackModal from "@/components/FeedbackModal";

// Bas des pages du tableau de bord (proprios et voyageurs connectés) :
// « Une idée ou un problème ? » → FeedbackModal. Aussi accessible depuis le
// menu de compte (Navbar), sur toutes les pages.
export default function FeedbackCard() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  return (
    <>
      <section className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#ebebeb] bg-white p-5">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-charcoal-800">{t("cardTitle")}</h2>
          <p className="mt-1 text-sm text-charcoal-500">{t("cardBody")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start sm:self-auto shrink-0 rounded-full border border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-[#f5f6ec] transition-colors"
        >
          {t("cardCta")}
        </button>
      </section>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
