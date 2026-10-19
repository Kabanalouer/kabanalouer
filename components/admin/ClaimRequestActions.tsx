"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Boutons d'une demande de la file /admin/revendications.
export default function ClaimRequestActions({ id, kind, siblingCount = 0 }: { id: string; kind: "proof" | "dispute"; siblingCount?: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "refuse" | "handled") {
    if (action === "approve" && !window.confirm(`Transférer cette fiche${siblingCount > 0 ? ` et ${siblingCount} autre${siblingCount > 1 ? "s" : ""} fiche${siblingCount > 1 ? "s" : ""} de la même adresse` : ""} au demandeur ? Le propriétaire actuel (compte système) les perd.`)) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const button = "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60";
  return (
    <div className="mt-3">
      {kind === "proof" && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Explication envoyée au demandeur (facultatif, surtout en cas de refus)"
          className="w-full rounded-xl border border-[#ebebeb] px-3 py-2 text-sm text-charcoal-800"
        />
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {kind === "proof" ? (
          <>
            <button type="button" disabled={!!busy} onClick={() => act("approve")} className={`${button} bg-primary text-white hover:bg-primary-dark`}>
              {busy === "approve" ? "Transfert…" : "Approuver et transférer"}
            </button>
            <button type="button" disabled={!!busy} onClick={() => act("refuse")} className={`${button} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
              {busy === "refuse" ? "Refus…" : "Refuser"}
            </button>
          </>
        ) : (
          <button type="button" disabled={!!busy} onClick={() => act("handled")} className={`${button} border border-charcoal-300 bg-white text-charcoal-800 hover:bg-charcoal-50`}>
            {busy === "handled" ? "Classement…" : "Marquer comme traité"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-error-600" role="alert">{error}</p>}
    </div>
  );
}
