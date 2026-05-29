"use client";

import { useState } from "react";
import Link from "next/link";

const PUBLISH_FEATURES = [
  "Annonce visible sur Kabanalouer",
  "Messagerie avec les voyageurs",
  "Calendrier de disponibilités",
  "Synchronisation iCal",
  "Tableau de bord et statistiques",
  "Accès illimité pendant 1 an",
];

const FREE_LAUNCH_LIMIT = 50;

export default function PublishPageClient({
  listingId,
  canPublish,
  missingPhotos,
  missingCitq,
  minPhotos,
  isFree,
  slotsLeft,
  activeSubscriptionCount,
}: {
  listingId: string;
  canPublish: boolean;
  missingPhotos: boolean;
  missingCitq: boolean;
  minPhotos: number;
  isFree: boolean;
  slotsLeft: number;
  activeSubscriptionCount: number;
}) {
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");

  const handleActivateFree = async () => {
    setPublishLoading(true);
    setPublishError("");
    const res = await fetch("/api/subscriptions/activate-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setPublishError(data.error ?? "Une erreur s'est produite.");
      setPublishLoading(false);
      return;
    }
    window.location.href = `/chalets/${listingId}?published=1`;
  };

  const handleStripeCheckout = async () => {
    setPublishLoading(true);
    setPublishError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      setPublishError("Impossible de démarrer le paiement. Réessayez.");
      setPublishLoading(false);
      return;
    }
    const { url } = await res.json();
    if (url) window.location.href = url;
    else {
      setPublishError("URL de paiement manquante.");
      setPublishLoading(false);
    }
  };

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  return (
    <div className="max-w-md space-y-5">
      {!canPublish && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Complétez votre annonce avant de publier :</p>
          {missingPhotos && (
            <Link href={`/dashboard/listings/${listingId}/edit`} className="block text-sm text-amber-700 hover:underline">
              → Ajoutez au moins {minPhotos} photos
            </Link>
          )}
          {missingCitq && (
            <Link href={`/dashboard/listings/${listingId}/edit`} className="block text-sm text-amber-700 hover:underline">
              → Entrez votre numéro CITQ (6 chiffres)
            </Link>
          )}
        </div>
      )}

      {isFree && (
        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold">
          Offre de lancement
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-charcoal-800 mb-1">
          {isFree ? "Publiez votre chalet gratuitement" : "Publiez votre chalet"}
        </h3>
        {isFree && (
          <>
            <div className="flex items-center justify-between mb-1 mt-3">
              <span className="text-xs text-charcoal-600">Places gratuites restantes</span>
              <span className="text-xs font-bold text-primary">{slotsLeft} / {FREE_LAUNCH_LIMIT}</span>
            </div>
            <div className="w-full bg-charcoal-100 rounded-full h-1.5">
              <div
                className="bg-primary rounded-full h-1.5"
                style={{ width: `${(activeSubscriptionCount / FREE_LAUNCH_LIMIT) * 100}%` }}
              />
            </div>
            <p className="text-xs text-charcoal-400 mt-1">
              Il reste <strong className="text-charcoal-700">{slotsLeft} place{slotsLeft > 1 ? "s" : ""} gratuite{slotsLeft > 1 ? "s" : ""}</strong> sur {FREE_LAUNCH_LIMIT}
            </p>
          </>
        )}
      </div>

      <ul className="space-y-1.5">
        {PUBLISH_FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-charcoal-700">
            <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <div>
        {isFree ? (
          <>
            <p className="text-sm text-charcoal-400 line-through mb-0.5">299 $/an</p>
            <p className="text-2xl font-extrabold text-primary mb-1">GRATUIT</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-charcoal-800 mb-0.5">299 $</p>
            <p className="text-sm text-charcoal-400 mb-1">par année</p>
          </>
        )}
      </div>

      {publishError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{publishError}</p>
      )}

      {isFree ? (
        <>
          <button
            onClick={handleActivateFree}
            disabled={publishLoading || !canPublish}
            className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          >
            {publishLoading ? "Activation…" : "Activer mon annonce gratuitement"}
          </button>
          <p className="text-xs text-charcoal-400">
            Valide jusqu&apos;au{" "}
            {oneYearFromNow.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </>
      ) : (
        <>
          <button
            onClick={handleStripeCheckout}
            disabled={publishLoading || !canPublish}
            className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          >
            {publishLoading ? "Redirection vers le paiement…" : "Payer et publier — 299 $/an"}
          </button>
          <p className="text-xs text-charcoal-400">Paiement sécurisé par Stripe · Annulable à tout moment</p>
        </>
      )}
    </div>
  );
}
