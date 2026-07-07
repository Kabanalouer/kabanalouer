"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Le lien de confirmation email/mot de passe (Send Email Hook) atterrit sur
// cette page avec ?code=... — le SDK Supabase échange ce code automatiquement
// (detectSessionInUrl + PKCE) dès qu'il est instancié, sans route serveur
// dédiée. On écoute l'événement SIGNED_IN qui en résulte pour déclencher
// l'email de bienvenue voyageur côté serveur, une seule fois.
export default function AuthCodeWelcomeTrigger() {
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    const hadCode = new URLSearchParams(window.location.search).has("code");
    if (!hadCode) return;

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (fired.current || event !== "SIGNED_IN") return;
      fired.current = true;
      fetch("/api/auth/welcome-traveler", { method: "POST" }).catch(() => {});
      router.replace(pathname);
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
