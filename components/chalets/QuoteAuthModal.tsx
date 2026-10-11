"use client";

import { trackEvent } from "@/lib/analytics";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localePath } from "@/lib/localePath";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = "0x4AAAAAADun6nA4SV0GHTM6";

type Mode = "login" | "signup";

interface Props {
  onClose: () => void;
  // Fired only once a real session exists (login tab, or an already-confirmed
  // account) — signup alone never fires this, see SignupTab's own success state.
  onAuthenticated: () => void;
}

export default function QuoteAuthModal({ onClose, onAuthenticated }: Props) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  // Inscription par défaut : la plupart des visiteurs qui ouvrent cette
  // fenêtre (demande de prix, contact, favori) n'ont pas encore de compte.
  const [mode, setMode] = useState<Mode>("signup");

  // Portal — renders outside any stacking context. Without it, this modal is
  // nested inside ContactForm's ancestor `sticky top-24` wrapper (right sidebar,
  // see ListingDetail.tsx), and `position: sticky` always creates its own
  // stacking context regardless of z-index — trapping this modal's z-index so
  // it only wins against siblings inside that wrapper, not the rest of the
  // page (e.g. the availability calendar bleeding through in a band). Same
  // fix already used by FiltersModal.tsx for the same reason.
  if (typeof document === "undefined") return null;

  return createPortal(
    // Portals still bubble through the REACT tree, not the DOM tree — a caller
    // like FavoriteButton can sit inside a <Link> (ListingCard.tsx), so a plain
    // backdrop click here would otherwise bubble up and trigger that Link's
    // navigation. stopPropagation keeps this self-contained regardless of caller.
    <div
      // overflow-y-auto + my-auto (plutôt que items-center) : sur un petit écran, le formulaire
      // d'inscription dépasse la hauteur et doit défiler sans que son haut soit coupé.
      className="fixed inset-0 bg-black/50 flex justify-center z-[9999] p-4 overflow-y-auto overscroll-contain"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="pr-4">
            <h3 className="font-bold text-charcoal-800 text-heading-3">{mode === "login" ? t("authModalLoginTitle") : t("authModalSignupTitle")}</h3>
            {mode === "signup" && <p className="text-sm text-charcoal-500 mt-1">{t("authModalSignupSubtitle")}</p>}
          </div>
          <button onClick={onClose} aria-label={tc("close")} className="text-charcoal-400 hover:text-charcoal-700 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-charcoal-50 rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 rounded-full text-sm font-semibold transition-colors ${mode === "login" ? "bg-white text-charcoal-800 shadow-sm" : "text-charcoal-500"}`}
          >
            {t("authModalLoginTab")}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`py-2 rounded-full text-sm font-semibold transition-colors ${mode === "signup" ? "bg-white text-charcoal-800 shadow-sm" : "text-charcoal-500"}`}
          >
            {t("authModalSignupTab")}
          </button>
        </div>

        <GoogleButton />

        {mode === "login" ? (
          <LoginTab onAuthenticated={onAuthenticated} />
        ) : (
          <SignupTab onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Login tab ──────────────────────────────────────────────────────────────

function LoginTab({ onAuthenticated }: { onAuthenticated: () => void }) {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setLoading(true);
    setError("");
    const token = turnstileToken;
    setTurnstileToken(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: token },
    });
    if (error) {
      setError(t("invalidCredentials"));
      setLoading(false);
      turnstileRef.current?.reset();
      return;
    }
    onAuthenticated();
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && <div className="bg-error-50 text-error-600 rounded-xl p-3 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("emailLabel")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          placeholder={t("emailPlaceholder")}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("passwordLabel")}</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 pr-11 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-charcoal-400 hover:text-charcoal-600 transition-colors"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="flex justify-end mt-1.5">
          <Link href={localePath("/forgot-password", locale)} className={`text-sm ${TEXT_LINK_CLASSNAME}`}>
            {t("forgotPasswordLink")}
          </Link>
        </div>
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        sitekey={TURNSTILE_SITE_KEY}
        onSuccess={(token) => setTurnstileToken(token)}
        onReset={() => setTurnstileToken(null)}
      />

      <button
        type="submit"
        disabled={loading || !turnstileToken}
        className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

// ── Signup tab (role locked to traveler — this modal only opens for someone
// requesting a quote, never a proprio) ───────────────────────────────────────

function SignupTab({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const t = useTranslations("auth.signup");
  const tl = useTranslations("listing");
  const locale = useLocale();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setLoading(true);
    setError("");
    setAccountExists(false);
    const token = turnstileToken;
    setTurnstileToken(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: token,
        data: {
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`,
          role: "traveler",
          preferred_language: locale,
        },
        // Le lien de confirmation ramène sur la page d'où vient l'inscription
        // (fiche chalet, déjà dans la bonne langue) : AuthCodeWelcomeTrigger y
        // échange le ?code= et ContactForm y remet la demande gardée
        // (lib/pendingQuoteDraft.ts). Une URL refusée par Supabase retombe sur
        // son Site URL (accueil français) : jamais de lien cassé.
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      turnstileRef.current?.reset();
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setAccountExists(true);
      setLoading(false);
      turnstileRef.current?.reset();
      return;
    }
    trackEvent("sign_up", { method: "courriel", role: "traveler", context: "demande_devis" });
    // Confirmation par courriel requise (Send Email Hook, voir CLAUDE.md) —
    // pas de session ici, donc pas d'onAuthenticated : l'utilisateur doit
    // confirmer puis revenir se connecter avant de pouvoir envoyer sa demande.
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-charcoal-800 text-heading-3 mb-2">{t("checkEmailTitle")}</h3>
        <p className="text-charcoal-500 text-base leading-relaxed mb-4">
          {t.rich("checkEmailDesc", {
            email,
            strong: (chunks) => <strong className="text-charcoal-800">{chunks}</strong>,
          })}{" "}
          {tl("authModalCheckEmailReturn")}
        </p>
        <button type="button" onClick={onSwitchToLogin} className={`text-sm ${TEXT_LINK_CLASSNAME}`}>
          {t("loginLink")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      {(error || accountExists) && (
        <div className="bg-error-50 text-error-600 rounded-xl p-3 text-sm">
          {accountExists ? (
            <>
              {t("accountExists")}{" "}
              <button type="button" onClick={onSwitchToLogin} className="font-semibold underline">
                {t("accountExistsLoginLink")}
              </button>
            </>
          ) : (
            error
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("firstNameLabel")}</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            placeholder={t("firstNamePlaceholder")}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("lastNameLabel")}</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            placeholder={t("lastNamePlaceholder")}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("emailLabel")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          placeholder={t("emailPlaceholder")}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("passwordLabel")}</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 pr-11 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            placeholder={t("passwordPlaceholder")}
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-charcoal-400 hover:text-charcoal-600 transition-colors"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <TurnstileWidget
        ref={turnstileRef}
        sitekey={TURNSTILE_SITE_KEY}
        onSuccess={(token) => setTurnstileToken(token)}
        onReset={() => setTurnstileToken(null)}
      />

      <button
        type="submit"
        disabled={loading || !turnstileToken}
        className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? t("submitting") : t("submit")}
      </button>

      <p className="text-center text-sm text-charcoal-500">
        {t("alreadyAccount")}{" "}
        <button type="button" onClick={onSwitchToLogin} className={TEXT_LINK_CLASSNAME}>
          {t("loginLink")}
        </button>
      </p>

      <p className="text-center text-sm text-charcoal-400">
        {t("termsNote")}{" "}
        <Link href={localePath("/conditions", locale)} className="underline hover:text-charcoal-600">
          {t("termsLink")}
        </Link>
        .
      </p>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

// Google : le retour passe par /auth/callback puis revient sur cette page
// (adresse complète, dates comprises) ; la demande commencée est remise par
// ContactForm depuis lib/pendingQuoteDraft.ts. Rôle voyageur par défaut.
function GoogleButton() {
  const t = useTranslations("auth.signup");
  const locale = useLocale();

  const handleGoogle = async () => {
    trackEvent("sign_up_start", { method: "google", role: "traveler", context: "demande_devis" });
    const params = new URLSearchParams({ next: `${window.location.pathname}${window.location.search}` });
    if (locale !== "fr") params.set("locale", locale);
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?${params.toString()}` },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 border border-[#ebebeb] rounded-full py-3 px-4 hover:bg-charcoal-50 transition-colors font-medium text-charcoal-700 text-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {t("continueGoogle")}
      </button>
      <div className="flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-charcoal-200" />
        <span className="text-xs text-charcoal-400">{t("or")}</span>
        <div className="flex-1 h-px bg-charcoal-200" />
      </div>
    </>
  );
}
