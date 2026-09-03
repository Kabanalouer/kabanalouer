"use client";

import { useState } from "react";

// Le proprio n'entre que le prix total (taxes incluses, en dollars) — tout le
// reste du devis (dates/voyageurs de la demande initiale, prénom du voyageur,
// section "Devis" de l'annonce) est assemblé automatiquement côté serveur.
export default function QuoteWidget({
  listingId,
  receiverId,
  onSent,
}: {
  listingId: string;
  receiverId: string;
  onSent: () => void;
}) {
  const [price, setPrice] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const priceValue = parseFloat(price.replace(",", "."));
  const canSend = Number.isFinite(priceValue) && priceValue > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/messages/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        receiverId,
        priceCents: Math.round(priceValue * 100),
      }),
    });

    if (!res.ok) {
      setError("Erreur lors de l'envoi du devis. Réessayez.");
      setSending(false);
      return;
    }

    setPrice("");
    setSending(false);
    onSent();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label className="block text-xs font-medium text-charcoal-500 mb-1">
          Prix total (taxes incluses)
        </label>
        <div className="relative max-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder="450"
            className="w-full border border-[#ebebeb] rounded-xl pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSend}
        disabled={sending || !canSend}
        className="self-start bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {sending ? "Envoi en cours…" : "Envoyer le devis"}
      </button>
    </div>
  );
}
