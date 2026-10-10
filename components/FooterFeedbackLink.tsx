"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FeedbackModal from "@/components/FeedbackModal";

// Pied de page, toutes les pages : « Une idée ou un problème ? ».
// Connecté (proprio ou voyageur) → fenêtre de retour (Admin → Retours des
// utilisateurs). Non connecté → formulaire de contact (pas de retours anonymes).
export default function FooterFeedbackLink({ label, contactHref }: { label: string; contactHref: string }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/supabase/client").then(({ createClient }) =>
      createClient().auth.getUser().then(({ data }) => {
        if (!cancelled) setLoggedIn(!!data.user);
      }),
    ).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const className = "inline-flex items-center min-h-[44px] md:min-h-0 text-charcoal-500 hover:text-charcoal-800 transition-colors";

  return (
    <li>
      {loggedIn ? (
        <button type="button" onClick={() => setOpen(true)} className={className}>
          {label}
        </button>
      ) : (
        <Link href={contactHref} className={className}>
          {label}
        </Link>
      )}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </li>
  );
}
