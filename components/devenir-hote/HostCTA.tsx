"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  label: string;
  className: string;
};

export default function HostCTA({ label, className }: Props) {
  const [isTraveler, setIsTraveler] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === "traveler") setIsTraveler(true);
        });
    });
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/upgrade-to-host", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  if (!isTraveler) {
    return (
      <Link href="/signup?role=host" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setShowModal(true)} className={className}>
        {label}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-[#ebebeb] p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-charcoal-800 mb-3">
              Vous avez déjà un compte Kabanalouer
            </h2>
            <p className="text-charcoal-500 text-sm leading-relaxed mb-6">
              Voulez-vous activer le mode propriétaire sur votre compte existant ?
            </p>
            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm mb-4">{error}</div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 bg-primary text-white font-bold py-3 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Activation…" : "Activer mon compte proprio"}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-[#ebebeb] text-charcoal-700 font-semibold py-3 rounded-full hover:border-primary hover:text-primary transition-colors text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
