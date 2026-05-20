"use client";

import { useState } from "react";

interface Props {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteListingModal({ listingId, listingTitle, onClose, onDeleted }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const confirmed = input.trim() === listingTitle.trim();

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Une erreur s'est produite. Réessayez.");
      setLoading(false);
      return;
    }
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Supprimer votre annonce</h2>

        <div className="text-sm text-gray-600 space-y-3 mb-6 leading-relaxed">
          <p>
            Êtes-vous certain de vouloir supprimer cette annonce ?{" "}
            <strong className="text-gray-800">Cette action est irréversible.</strong>
          </p>
          <p>
            Votre abonnement ne sera ni remboursé ni transférable à une autre annonce.
          </p>
          <p>Nous sommes désolés de vous voir quitter la communauté Kabanalouer. 😔</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listingTitle}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Tapez <strong className="text-gray-600">{listingTitle}</strong> pour confirmer
          </p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
