"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Invitation facultative pour un voyageur arrivé par la demande sans compte visible
// (compte « guest », voir /api/messages/guest) : ajouter un mot de passe pour se reconnecter
// plus vite. Fermable (rappel gardé dans le navigateur) ; jamais imposée.
const STORAGE_KEY = "kbl_pw_invite_dismissed";

export default function PasswordInviteBanner({ onHidden }: { onHidden: () => void }) {
  const t = useTranslations("messages");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // stockage indisponible : le rappel reviendra à la prochaine visite
    }
    onHidden();
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    // Client Supabase chargé au clic seulement (règle de performance des pages publiques)
    const { createClient } = await import("@/lib/supabase/client");
    const { error } = await createClient().auth.updateUser({ password, data: { guest: false } });
    setStatus(error ? "error" : "done");
    if (!error) setTimeout(dismiss, 2500);
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-[#f5f6ec] p-4" role="note">
      {status === "done" ? (
        <p className="text-sm font-medium text-success-700" role="status">{t("passwordInviteDone")}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal-800">{t("passwordInviteTitle")}</p>
              <p className="mt-0.5 text-sm text-charcoal-600">{t("passwordInviteBody")}</p>
            </div>
            <button type="button" onClick={dismiss} aria-label={t("passwordInviteClose")} className="shrink-0 rounded-full p-1 text-charcoal-400 hover:text-charcoal-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          {open ? (
            <form onSubmit={save} className="mt-3 flex flex-wrap gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
                placeholder={t("passwordInvitePlaceholder")}
                autoComplete="new-password"
                aria-label={t("passwordInvitePlaceholder")}
                className="min-w-0 flex-1 rounded-xl border border-[#ebebeb] bg-white px-3 py-2 text-base text-charcoal-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button type="submit" disabled={status === "saving"} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                {status === "saving" ? t("passwordInviteSaving") : t("passwordInviteSave")}
              </button>
              {status === "error" && <p className="w-full text-sm text-error-600" role="alert">{t("passwordInviteError")}</p>}
            </form>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
              {t("passwordInviteCta")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
