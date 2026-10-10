"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { trackEvent } from "@/lib/analytics";
import { trackFunnelStep } from "@/lib/funnel";

export const NEW_LISTING_PATH = "/dashboard/listings/new";

type Role = "anon" | "owner" | "traveler";

type OwnerAccess = {
  hrefFor: (target: string) => string;
  // Voyageur connecté : ouvre la fenêtre « Activer mon compte proprio » au
  // lieu de naviguer. Retourne false si la navigation doit être annulée.
  guard: (target: string) => boolean;
  navigate: (target: string) => void;
};

const OwnerAccessContext = createContext<OwnerAccess | null>(null);

export function useOwnerAccess(): OwnerAccess {
  const ctx = useContext(OwnerAccessContext);
  if (!ctx) throw new Error("useOwnerAccess doit être utilisé dans <OwnerAccessProvider>");
  return ctx;
}

export function OwnerAccessProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const [role, setRole] = useState<Role>("anon");
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Client Supabase chargé une fois la page au repos : il ne pèse pas sur
    // le premier affichage (Lighthouse mobile) et la plupart des visiteurs
    // de cette page ne sont pas connectés.
    const check = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (!cancelled) setRole(data?.role === "traveler" ? "traveler" : "owner");
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void check());
    else setTimeout(() => void check(), 1500);
    return () => { cancelled = true; };
  }, []);

  const hrefFor = useCallback(
    (target: string) =>
      role === "owner"
        ? localePath(target, locale)
        : localePath(`/signup?role=host&next=${encodeURIComponent(localePath(target, locale))}`, locale),
    [role, locale]
  );

  const guard = useCallback(
    (target: string) => {
      if (role !== "traveler") return true;
      setPendingTarget(target);
      return false;
    },
    [role]
  );

  const navigate = useCallback(
    (target: string) => {
      if (guard(target)) router.push(hrefFor(target));
    },
    [guard, hrefFor, router]
  );

  const value = useMemo(() => ({ hrefFor, guard, navigate }), [hrefFor, guard, navigate]);

  return (
    <OwnerAccessContext.Provider value={value}>
      {children}
      {pendingTarget && (
        <UpgradeModal
          target={pendingTarget}
          onClose={() => setPendingTarget(null)}
        />
      )}
    </OwnerAccessContext.Provider>
  );
}

export function CreateListingLink({
  emplacement,
  className,
  children,
}: {
  emplacement: string;
  className: string;
  children: React.ReactNode;
}) {
  const { hrefFor, guard } = useOwnerAccess();
  return (
    <Link
      href={hrefFor(NEW_LISTING_PATH)}
      className={className}
      onClick={(e) => {
        trackEvent("lp_hote_creer_annonce", { emplacement });
        trackFunnelStep("h_cta");
        if (!guard(NEW_LISTING_PATH)) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}

function UpgradeModal({ target, onClose }: { target: string; onClose: () => void }) {
  const locale = useLocale();
  const isEn = locale === "en";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/upgrade-to-host", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // EN : message générique maison — l'erreur de l'API peut être en français.
      setError(isEn ? "Something went wrong. Please try again." : body.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }
    router.push(localePath(target, locale));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="bg-white rounded-2xl shadow-xl border border-[#ebebeb] p-8 w-full max-w-md"
      >
        <h2 id="upgrade-title" className="text-heading-3 font-bold text-charcoal-800 mb-3">
          {isEn ? "You already have a Kabanalouer account" : "Vous avez déjà un compte Kabanalouer"}
        </h2>
        <p className="text-charcoal-500 text-base leading-relaxed mb-6">
          {isEn
            ? "Would you like to turn on owner mode for your existing account?"
            : "Voulez-vous activer le mode propriétaire sur votre compte existant ?"}
        </p>
        {error && (
          <div className="bg-error-50 text-error-600 rounded-xl p-3 text-sm mb-4">{error}</div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 bg-primary text-white font-bold py-3 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {loading
              ? isEn ? "Activating…" : "Activation…"
              : isEn ? "Activate my owner account" : "Activer mon compte proprio"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#ebebeb] text-charcoal-700 font-semibold py-3 rounded-full hover:border-primary hover:text-primary transition-colors text-sm"
          >
            {isEn ? "Cancel" : "Annuler"}
          </button>
        </div>
      </div>
    </div>
  );
}
