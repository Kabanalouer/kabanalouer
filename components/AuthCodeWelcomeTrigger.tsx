"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Le lien de confirmation email/mot de passe (Send Email Hook) atterrit sur
// la page d'accueil, ou sur la fiche chalet quand l'inscription vient de la
// fenêtre de demande de prix (QuoteAuthModal), avec ?code=... — le SDK
// Supabase échange ce code automatiquement (detectSessionInUrl + PKCE) dès
// qu'il est instancié, sans route serveur dédiée. On écoute l'événement
// SIGNED_IN qui en résulte pour déclencher l'email de bienvenue voyageur côté
// serveur, une seule fois. Client Supabase chargé seulement si ?code= est
// présent : jamais sur une visite normale d'une page publique.
export default function AuthCodeWelcomeTrigger() {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    const hadCode = new URLSearchParams(window.location.search).has("code");
    if (!hadCode) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (fired.current || event !== "SIGNED_IN") return;
        fired.current = true;
        fetch("/api/auth/welcome-traveler", { method: "POST" }).catch(() => {});
        // Chemin réel du navigateur (pas usePathname, qui peut renvoyer le
        // chemin réécrit des fiches chalet) : retire ?code= et recharge les
        // données serveur avec la nouvelle session.
        router.replace(window.location.pathname);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
