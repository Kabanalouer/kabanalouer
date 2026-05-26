"use client";

import { useState } from "react";

interface Props {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteListingModal({ listingId, listingTitle, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
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
        <h2 className="text-lg font-bold text-charcoal-800 mb-1">Supprimer cette annonce</h2>
        <p className="text-sm text-charcoal-500 mb-5 leading-relaxed">
          <strong className="text-charcoal-700">&ldquo;{listingTitle}&rdquo;</strong> sera supprimée définitivement.
          Cette action est irréversible.
        </p>

        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 leading-relaxed">
          Toutes les photos, disponibilités et données associées seront perdues.
          Votre abonnement ne sera ni remboursé ni transférable.
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#ebebeb] text-charcoal-700 py-2.5 rounded-full text-sm font-semibold hover:bg-charcoal-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
