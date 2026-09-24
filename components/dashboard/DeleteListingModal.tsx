"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteListingModal({ listingId, onClose, onDeleted }: Props) {
  const t = useTranslations("listings.delete");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("error"));
      setLoading(false);
      return;
    }
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-heading-3 font-bold text-charcoal-800 mb-5">{t("title")}</h2>

        <div className="bg-error-50 border border-error-100 rounded-xl px-4 py-3 mb-6 text-base text-error-700 space-y-1.5 leading-relaxed">
          <p>{t("irreversible")}</p>
          <p>{t("warning")}</p>
          <p>{t("subscriptionNote")}</p>
        </div>

        {error && <p className="text-sm text-error-500 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#ebebeb] text-charcoal-700 py-2.5 rounded-full text-sm font-semibold hover:bg-charcoal-50 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-error-600 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-error-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("deleting") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
