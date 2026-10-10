"use client";

import { useState, useTransition } from "react";
import { generateReportNow } from "@/app/admin/rapports/actions";

export default function GenerateReportButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const { error } = await generateReportNow();
            setMessage(error ?? "Rapport généré et envoyé par courriel.");
          })
        }
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:bg-charcoal-200 disabled:text-charcoal-400 transition-colors"
      >
        {pending ? "Analyse en cours… (1 à 2 min)" : "Générer un rapport maintenant"}
      </button>
      {message && <p className="text-xs text-charcoal-500">{message}</p>}
    </div>
  );
}
