"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localePath } from "@/lib/localePath";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = "0x4AAAAAADun6nA4SV0GHTM6";
const PHONE_REGEX = /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

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
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-bold text-charcoal-800 text-lg pr-4">{t("authModalTitle")}</h3>
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

        {mode === "login" ? (
          <LoginTab onAuthenticated={onAuthenticated} />
        ) : (
          <SignupTab onSwitchToLogin={() => setMode("login")} />
        )}
      </div>
    </div>
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
      {error && <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("emailLabel")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
          <Link href={localePath("/forgot-password", locale)} className={`text-xs ${TEXT_LINK_CLASSNAME}`}>
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
  const locale = useLocale();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
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
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      setPhoneError(t("phoneInvalid"));
      return;
    }
    setPhoneError("");
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
          phone: trimmedPhone || null,
        },
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
        <h3 className="font-bold text-charcoal-800 text-lg mb-2">{t("checkEmailTitle")}</h3>
        <p className="text-charcoal-500 text-sm leading-relaxed mb-4">
          {t.rich("checkEmailDesc", {
            email,
            strong: (chunks) => <strong className="text-charcoal-800">{chunks}</strong>,
          })}
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
        <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
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
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          placeholder={t("emailPlaceholder")}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {t("phoneLabel")} <span className="text-charcoal-400 font-normal">{t("phoneOptionalTag")}</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) setPhoneError("");
          }}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          placeholder={t("phonePlaceholder")}
        />
        {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("passwordLabel")}</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
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

      <p className="text-center text-xs text-charcoal-400">
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
