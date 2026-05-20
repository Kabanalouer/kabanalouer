"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FREE_LAUNCH_LIMIT = 50;

const FEATURES = [
  "Annonce visible sur Kabanalouer",
  "Messagerie avec les voyageurs",
  "Calendrier de disponibilités",
  "Synchronisation iCal",
  "Tableau de bord et statistiques",
  "Accès illimité pendant 1 an",
];

interface Props {
  listingId: string;
  listingTitle: string;
  activeCount: number;
  hasActiveSubscription: boolean;
  subscriptionExpiresAt: string | null;
  paid?: boolean;
  canceled?: boolean;
}

export default function PublishUI({
  listingId,
  listingTitle,
  activeCount,
  hasActiveSubscription,
  subscriptionExpiresAt,
  paid,
  canceled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slotsLeft = Math.max(0, FREE_LAUNCH_LIMIT - activeCount);
  const isFree = slotsLeft > 0;

  const expiryDisplay = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleActivateFree = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/subscriptions/activate-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Une erreur s'est produite.");
      setLoading(false);
      return;
    }
    router.push(`/chalets/${listingId}?published=1`);
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!res.ok) {
      setError("Impossible de démarrer le paiement. Réessayez.");
      setLoading(false);
      return;
    }
    const { url } = await res.json();
    if (url) window.location.href = url;
    else {
      setError("URL de paiement manquante.");
      setLoading(false);
    }
  };

  const handlePublishDirect = async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/listings/${listingId}/publish`, { method: "POST" });
    if (!res.ok) {
      setError("Erreur lors de la publication.");
      setLoading(false);
      return;
    }
    router.push(`/chalets/${listingId}?published=1`);
  };

  // Already subscribed — simple confirmation
  if (hasActiveSubscription) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href={`/dashboard/listings/${listingId}/edit`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← Retour à l&apos;édition
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Votre abonnement est actif</h1>
          {expiryDisplay && (
            <p className="text-sm text-gray-500 mb-6">Valide jusqu&apos;au {expiryDisplay}</p>
          )}
          <p className="text-sm text-gray-600 mb-6 line-clamp-2">
            <span className="font-medium">{listingTitle}</span> est prêt à être publié.
          </p>
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <button
            onClick={handlePublishDirect}
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Publication…" : "Publier mon annonce maintenant"}
          </button>
        </div>
      </div>
    );
  }

  // Paid flow: processing state
  if (paid) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement en cours de traitement</h1>
          <p className="text-sm text-gray-500 mb-6">
            Votre abonnement sera activé dans quelques instants. Votre annonce sera publiée automatiquement.
          </p>
          <Link
            href="/dashboard/listings"
            className="inline-block text-primary font-semibold text-sm hover:underline"
          >
            ← Retour à mes annonces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/listings/${listingId}/edit`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Retour à l&apos;édition
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="p-6 pb-5 border-b border-gray-100">
          {isFree ? (
            <>
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold mb-4">
                🎉 Offre de lancement
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Publiez votre chalet gratuitement
              </h1>
              <p className="text-sm text-gray-500 line-clamp-1">{listingTitle}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Publiez votre chalet
              </h1>
              <p className="text-sm text-gray-500 line-clamp-1">{listingTitle}</p>
            </>
          )}
        </div>

        {/* Slot counter */}
        {isFree && (
          <div className="px-6 pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Places gratuites restantes</span>
              <span className="text-sm font-bold text-primary">{slotsLeft} / {FREE_LAUNCH_LIMIT}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${(activeCount / FREE_LAUNCH_LIMIT) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Il reste <strong className="text-gray-700">{slotsLeft} place{slotsLeft > 1 ? "s" : ""} gratuite{slotsLeft > 1 ? "s" : ""}</strong> sur {FREE_LAUNCH_LIMIT}
            </p>
          </div>
        )}

        {/* Features */}
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Ce que ça comprend</p>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Price + CTA */}
        <div className="px-6 pb-6 border-t border-gray-100 pt-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              {isFree ? (
                <>
                  <p className="text-sm text-gray-400 line-through">199 $/an</p>
                  <p className="text-3xl font-extrabold text-primary">GRATUIT</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-extrabold text-gray-900">199 $</p>
                  <p className="text-sm text-gray-400">par année</p>
                </>
              )}
            </div>
          </div>

          {canceled && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Le paiement a été annulé. Votre annonce n&apos;a pas été publiée.
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {isFree ? (
            <>
              <button
                onClick={handleActivateFree}
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Activation…" : "Activer mon annonce gratuitement"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Votre abonnement gratuit est valide jusqu&apos;au{" "}
                {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handleStripeCheckout}
                disabled={loading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Redirection vers le paiement…" : "Payer et publier — 199 $/an"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Paiement sécurisé par Stripe · Annulable à tout moment
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
