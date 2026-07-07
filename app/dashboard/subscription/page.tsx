"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  status: string;
  expires_at: string | null;
  is_free_launch: boolean | null;
};

export default function SubscriptionPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("subscriptions")
        .select("status, expires_at, is_free_launch")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setSub(data);
          setLoading(false);
        });
    });
  }, []);

  const handleSubscribe = async () => {
    setRedirecting(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setRedirecting(false);
  };

  const handlePortal = async () => {
    setRedirecting(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setRedirecting(false);
  };

  const isActive = sub?.status === "active";
  const isFreeLaunch = sub?.is_free_launch === true;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal-800 mb-2">Abonnement</h1>
      <p className="text-charcoal-500 mb-8">
        Gérez votre abonnement annuel pour publier vos chalets sur Kabanalouer.
      </p>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium text-sm">
            Abonnement activé avec succès ! Vous pouvez maintenant publier vos chalets.
          </p>
        </div>
      )}

      {canceled && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          Le paiement a été annulé. Votre abonnement n&apos;a pas été modifié.
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 animate-pulse h-40" />
      ) : (
        <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
          {/* Status card */}
          <div className="p-6 border-b border-[#ebebeb] flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal-500 mb-1">Statut</p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    isActive ? "bg-green-500" : "bg-charcoal-300"
                  }`}
                />
                <span className="font-semibold text-charcoal-800">
                  {isActive ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
            {isActive && sub?.expires_at && (
              <div className="text-right">
                <p className="text-sm text-charcoal-500 mb-1">Renouvellement</p>
                <p className="font-semibold text-charcoal-800">
                  {new Date(sub.expires_at).toLocaleDateString("fr-CA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Plan details */}
          <div className="p-6 border-b border-[#ebebeb]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-charcoal-800 text-lg">Abonnement propriétaire</p>
                <p className="text-charcoal-500 text-sm mt-1">
                  Publiez un nombre illimité de chalets sur Kabanalouer
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "Annonces illimitées",
                    "Messagerie avec les voyageurs",
                    "Génération IA de descriptions",
                    "Tableau de bord complet",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-charcoal-600">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right flex-shrink-0 ml-6">
                <p className="text-3xl font-extrabold text-charcoal-800">299 $</p>
                <p className="text-charcoal-400 text-sm">/ an</p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="p-6">
            {isActive && isFreeLaunch ? (
              <>
                <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-primary">Offre de lancement — accès gratuit</p>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Vous faites partie des premiers proprios sur Kabanalouer. Votre accès est gratuit pendant 1 an.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSubscribe}
                  disabled={redirecting}
                  className="w-full mt-4 border border-[#ebebeb] text-charcoal-700 py-3 rounded-full font-semibold text-sm hover:bg-charcoal-50 transition-colors disabled:opacity-50"
                >
                  {redirecting ? "Redirection vers le paiement…" : "Passer à l'abonnement payant"}
                </button>
              </>
            ) : isActive ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePortal}
                  disabled={redirecting}
                  className="flex-1 border border-[#ebebeb] text-charcoal-700 py-3 rounded-full font-semibold text-sm hover:bg-charcoal-50 transition-colors disabled:opacity-50"
                >
                  {redirecting ? "Redirection…" : "Gérer mon abonnement"}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSubscribe}
                  disabled={redirecting}
                  className="w-full bg-primary text-white py-3.5 rounded-full font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {redirecting ? "Redirection vers le paiement…" : "S'abonner pour 299 $/an"}
                </button>
                <p className="text-xs text-charcoal-400 text-center mt-3">
                  Paiement sécurisé par Stripe · Annulable à tout moment
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
