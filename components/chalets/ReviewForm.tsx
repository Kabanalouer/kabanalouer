"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS = ["", "Très mauvais", "Mauvais", "Moyen", "Bien", "Excellent"];

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export default function ReviewForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const active = hoverRating || rating;

  const handleSubmit = async () => {
    if (!rating) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, rating, comment: comment.trim() || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de l'envoi.");
      setSending(false);
      return;
    }
    setDone(true);
    router.refresh();
  };

  if (done) {
    return (
      <div className="border border-[#ebebeb] rounded-2xl p-6 text-center mt-8">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-charcoal-800 text-sm mb-1">Merci pour votre avis !</p>
        <p className="text-xs text-charcoal-400">Il apparaîtra dans quelques instants.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#ebebeb] rounded-2xl p-6 mt-8">
      <h3 className="font-semibold text-charcoal-800 mb-5">Laisser un avis</h3>

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          >
            <svg
              className={`w-8 h-8 fill-current transition-colors ${active >= star ? "text-primary" : "text-[#ebebeb]"}`}
              viewBox="0 0 20 20"
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        ))}
        {active > 0 && (
          <span className="ml-2 text-sm text-charcoal-500">{LABELS[active]}</span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="Décrivez votre expérience (optionnel)"
        className="w-full border border-[#ebebeb] rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
      />

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!rating || sending}
        className="bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? "Envoi…" : "Publier mon avis"}
      </button>
    </div>
  );
}
