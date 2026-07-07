"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ListingSub = {
  listing_id: string;
  status: string;
  expires_at: string | null;
  is_free_launch: boolean | null;
  price_cents: number | null;
};

type ListingRow = {
  id: string;
  title: string;
  sub: ListingSub | null;
};

export default function SubscriptionPage() {
  const supabase = createClient();

  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirectingId, setRedirectingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: listings }, { data: subs }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title")
          .eq("host_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("subscriptions")
          .select("listing_id, status, expires_at, is_free_launch, price_cents")
          .eq("user_id", user.id),
      ]);

      const subsByListing = new Map((subs ?? []).map((s) => [s.listing_id as string, s as ListingSub]));
      setRows((listings ?? []).map((l) => ({ id: l.id, title: l.title, sub: subsByListing.get(l.id) ?? null })));
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubscribe = async (listingId: string) => {
    setRedirectingId(listingId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setRedirectingId(null);
  };

  const handlePortal = async () => {
    setRedirectingId("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setRedirectingId(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal-800 mb-2">Abonnements</h1>
      <p className="text-charcoal-500 mb-8">
        Chaque chalet a son propre abonnement annuel — le tarif dépend du nombre de chalets payants déjà actifs au moment de l&apos;ajout.
      </p>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 animate-pulse h-40" />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebebeb] p-8 text-center text-charcoal-500 text-sm">
          Aucun chalet pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => {
            const sub = row.sub;
            const isActive = sub?.status === "active";
            const isPastDue = sub?.status === "past_due";
            const isFreeLaunch = sub?.is_free_launch === true;
            const redirecting = redirectingId === row.id || redirectingId === "portal";

            return (
              <div key={row.id} className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden">
                {/* Status */}
                <div className="p-6 border-b border-[#ebebeb] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-charcoal-500 mb-1">{row.title || "Chalet sans titre"}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          isActive ? "bg-green-500" : isPastDue ? "bg-amber-500" : "bg-charcoal-300"
                        }`}
                      />
                      <span className="font-semibold text-charcoal-800">
                        {isActive ? "Actif" : isPastDue ? "Paiement en retard" : "Inactif"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {sub?.price_cents != null && (
                      <p className="font-semibold text-charcoal-800">
                        {(sub.price_cents / 100).toLocaleString("fr-CA")} $ / an
                      </p>
                    )}
                    {isActive && sub?.expires_at && (
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        Renouvellement le{" "}
                        {new Date(sub.expires_at).toLocaleDateString("fr-CA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
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
                            Ce chalet fait partie des premiers de Kabanalouer. Son accès est gratuit pendant 1 an.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSubscribe(row.id)}
                        disabled={redirecting}
                        className="w-full mt-4 border border-[#ebebeb] text-charcoal-700 py-3 rounded-full font-semibold text-sm hover:bg-charcoal-50 transition-colors disabled:opacity-50"
                      >
                        {redirectingId === row.id ? "Redirection vers le paiement…" : "Passer à l'abonnement payant"}
                      </button>
                    </>
                  ) : isActive ? (
                    <button
                      onClick={handlePortal}
                      disabled={redirecting}
                      className="w-full border border-[#ebebeb] text-charcoal-700 py-3 rounded-full font-semibold text-sm hover:bg-charcoal-50 transition-colors disabled:opacity-50"
                    >
                      {redirectingId === "portal" ? "Redirection…" : "Gérer mon abonnement"}
                    </button>
                  ) : isPastDue ? (
                    <>
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                        Le dernier paiement a échoué. Mettez à jour votre méthode de paiement pour éviter une interruption.
                      </div>
                      <button
                        onClick={handlePortal}
                        disabled={redirecting}
                        className="w-full border border-[#ebebeb] text-charcoal-700 py-3 rounded-full font-semibold text-sm hover:bg-charcoal-50 transition-colors disabled:opacity-50"
                      >
                        {redirectingId === "portal" ? "Redirection…" : "Gérer mon abonnement"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSubscribe(row.id)}
                        disabled={redirecting}
                        className="w-full bg-primary text-white py-3.5 rounded-full font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {redirectingId === row.id ? "Redirection vers le paiement…" : "S'abonner"}
                      </button>
                      <p className="text-xs text-charcoal-400 text-center mt-3">
                        Paiement sécurisé par Stripe · Annulable à tout moment
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
