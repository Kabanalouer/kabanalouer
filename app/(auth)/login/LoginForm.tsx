"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { safeNextPath } from "@/lib/safeNextPath";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

const TURNSTILE_SITE_KEY = "0x4AAAAAADun6nA4SV0GHTM6";

// Délai minimal entre deux envois de lien de connexion (côté client — Supabase
// applique aussi sa propre limite côté serveur).
const MAGIC_LINK_COOLDOWN_SECONDS = 60;

function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const defaultHome = localePath("/", locale);
  const next = safeNextPath(searchParams.get("next"), defaultHome);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const isEn = locale === "en";

  // Lien de connexion par courriel (magic link)
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Le lien du courriel revient sur CETTE page avec ?token_hash=…&type=magiclink
  // (voir send-email-hook, buildActionLink) : le jeton est validé ici, côté
  // navigateur, pour qu'un antivirus de courriel qui « prévisite » le lien ne
  // l'use pas avant le vrai clic. Fonctionne aussi dans un autre navigateur.
  const buildCallbackUrl = () => {
    const params = new URLSearchParams();
    if (next !== defaultHome) params.set("next", next);
    const qs = params.toString();
    return `${window.location.origin}${localePath("/login", locale)}${qs ? `?${qs}` : ""}`;
  };

  const magicTokenHash = searchParams.get("token_hash");
  const magicType = searchParams.get("type");
  const [magicVerifying, setMagicVerifying] = useState(magicType === "magiclink" && !!magicTokenHash);
  const [magicVerifyError, setMagicVerifyError] = useState("");
  useEffect(() => {
    if (magicType !== "magiclink" || !magicTokenHash) return;
    let cancelled = false;
    void (async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: magicTokenHash, type: "magiclink" });
      if (cancelled) return;
      if (error) {
        setMagicVerifying(false);
        setMagicVerifyError(isEn
          ? "This sign-in link has expired or was already used. Request a new one below."
          : "Ce lien de connexion est expiré ou a déjà été utilisé. Demandez-en un nouveau ci-dessous.");
        return;
      }
      router.replace(next);
      router.refresh();
    })();
    return () => { cancelled = true; };
  }, [magicType, magicTokenHash]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setLoading(true);
    setError("");
    // Token is single-use — clear it before the request so the widget re-challenges on error
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
      // The widget's "Success" state doesn't know its token was just consumed —
      // force a fresh challenge so the button can become clickable again.
      turnstileRef.current?.reset();
      return;
    }
    router.push(next);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const params = new URLSearchParams();
    if (next !== defaultHome) params.set("next", next);
    if (locale !== "fr") params.set("locale", locale);
    const qs = params.toString();
    const callbackUrl = `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  };

  const sendMagicLink = async (targetEmail: string) => {
    if (!turnstileToken || magicLoading || cooldown > 0) return;
    setMagicLoading(true);
    setMagicError("");
    setError("");
    // Jeton Turnstile à usage unique (partagé avec la connexion par mot de passe)
    const token = turnstileToken;
    setTurnstileToken(null);

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    let failed = false;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: buildCallbackUrl(),
          captchaToken: token,
        },
      });
      if (error) {
        const code = (error as { code?: string }).code;
        // shouldCreateUser: false → Supabase refuse les courriels inconnus.
        // On affiche quand même la confirmation pour ne jamais révéler si un
        // compte existe.
        const unknownUser =
          code === "user_not_found" ||
          code === "signup_disabled" ||
          (code === "otp_disabled" && /signups? not allowed/i.test(error.message));
        if (!unknownUser) {
          failed = true;
          errorCode = code;
          errorStatus = error.status;
        }
      }
    } catch {
      failed = true;
    }

    // Le jeton vient d'être consommé : forcer un nouveau défi Turnstile
    turnstileRef.current?.reset();
    setMagicLoading(false);

    if (failed) {
      const rateLimited =
        errorStatus === 429 ||
        errorCode === "over_email_send_rate_limit" ||
        errorCode === "over_request_rate_limit";
      if (rateLimited) {
        setMagicError(
          isEn
            ? "Too many requests. Please wait a few minutes and try again."
            : "Trop de demandes. Patientez quelques minutes, puis réessayez."
        );
        setCooldown(MAGIC_LINK_COOLDOWN_SECONDS);
      } else if (errorCode === "captcha_failed") {
        setMagicError(
          isEn
            ? "The security check failed. Please try again."
            : "La vérification de sécurité a échoué. Veuillez réessayer."
        );
      } else {
        setMagicError(
          isEn
            ? "We couldn't send the sign-in link. Please try again."
            : "Impossible d'envoyer le lien de connexion. Veuillez réessayer."
        );
      }
      return;
    }

    setMagicSentTo(targetEmail);
    setCooldown(MAGIC_LINK_COOLDOWN_SECONDS);
  };

  const handleMagicLinkClick = () => {
    const input = emailInputRef.current;
    if (!email.trim()) {
      setMagicError(
        isEn
          ? "Enter your email address above to receive a sign-in link."
          : "Entrez votre adresse courriel ci-dessus pour recevoir un lien de connexion."
      );
      input?.focus();
      return;
    }
    if (input && !input.checkValidity()) {
      input.reportValidity();
      return;
    }
    void sendMagicLink(email.trim());
  };

  const signupHref = `${localePath("/signup", locale)}${next !== defaultHome ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-8 w-full max-w-md">
        <Link href={localePath("/", locale)} className="flex items-center justify-center mb-8" aria-label="Kabanalouer">
          <img
            src="/logo-wordmark.svg"
            alt="Kabanalouer"
            className="pointer-events-none"
            style={{ height: 60, width: "auto" }}
          />
        </Link>

        <h1 className="text-2xl font-bold text-charcoal-800 mb-1">{t("title")}</h1>
        <p className="text-charcoal-500 mb-8 text-base">{t("subtitle")}</p>

        {magicVerifying && (
          <div className="mb-6 flex items-center gap-2.5 bg-[#f5f6ec] border border-[#e8ead8] rounded-xl px-4 py-3 text-base text-charcoal-700" role="status">
            <svg className="w-5 h-5 animate-spin text-primary shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {isEn ? "Signing you in…" : "Connexion en cours…"}
          </div>
        )}
        {magicVerifyError && (
          <div className="mb-6 bg-error-50 border border-error-200 rounded-xl px-4 py-3 text-base text-error-700" role="alert">
            {magicVerifyError}
          </div>
        )}

        {magicSentTo ? (
          <div className="space-y-4">
            <div role="status" aria-live="polite" className="bg-charcoal-50 rounded-xl p-4">
              <p className="text-base font-semibold text-charcoal-800 mb-1">
                {isEn
                  ? "Check your email: we've sent you a sign-in link."
                  : "Vérifiez vos courriels\u00A0: nous vous avons envoyé un lien de connexion."}
              </p>
              <p className="text-sm text-charcoal-600">
                {isEn ? "Sent to " : "Envoyé à "}
                <strong className="font-semibold text-charcoal-800 break-all">{magicSentTo}</strong>
                {isEn
                  ? ". The link expires shortly and can only be used once. Open it in this browser to sign in."
                  : ". Le lien expire rapidement et ne peut être utilisé qu'une seule fois. Ouvrez-le dans ce navigateur pour vous connecter."}
              </p>
              <p className="text-sm text-charcoal-500 mt-2">
                {isEn
                  ? "Nothing yet? Check your spam folder, or make sure you used the address linked to your account."
                  : "Rien reçu\u202F? Vérifiez vos courriels indésirables ou assurez-vous d'avoir utilisé l'adresse de votre compte."}
              </p>
            </div>

            {magicError && (
              <div role="alert" className="bg-error-50 text-error-600 rounded-xl p-3 text-sm">{magicError}</div>
            )}

            <TurnstileWidget
              ref={turnstileRef}
              sitekey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onReset={() => setTurnstileToken(null)}
            />

            <button
              type="button"
              onClick={() => void sendMagicLink(magicSentTo)}
              disabled={magicLoading || cooldown > 0 || !turnstileToken}
              className="w-full border border-[#ebebeb] rounded-full py-3 px-4 hover:bg-charcoal-50 transition-colors font-medium text-charcoal-700 text-sm disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {magicLoading
                ? isEn ? "Sending…" : "Envoi…"
                : cooldown > 0
                  ? isEn ? `Resend link in ${cooldown}s` : `Renvoyer le lien dans ${cooldown}\u00A0s`
                  : isEn ? "Resend link" : "Renvoyer le lien"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMagicSentTo(null);
                  setMagicError("");
                }}
                className={`inline-flex items-center min-h-[44px] text-sm ${TEXT_LINK_CLASSNAME}`}
              >
                {isEn ? "Sign in with my password instead" : "Me connecter avec mon mot de passe"}
              </button>
            </div>
          </div>
        ) : (
        <>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-[#ebebeb] rounded-full py-3 px-4 hover:bg-charcoal-50 transition-colors mb-6 font-medium text-charcoal-700 text-sm"
        >
          <GoogleIcon />
          {t("continueGoogle")}
        </button>

        <Divider label={t("or")} />

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-error-50 text-error-600 rounded-xl p-3 text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-charcoal-700 mb-1.5">
              {t("emailLabel")}
            </label>
            <input
              ref={emailInputRef}
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder={t("emailPlaceholder")}
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-charcoal-700 mb-1.5">
              {t("passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                enterKeyHint="go"
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
            {/* Zone cliquable de 44px de haut, à 8px du champ ; -mb-3 compense
                la hauteur ajoutée pour garder l'espacement visuel d'avant */}
            <div className="flex justify-end mt-2 -mb-3">
              <Link
                href={localePath("/forgot-password", locale)}
                className={`inline-flex items-center min-h-[44px] text-sm ${TEXT_LINK_CLASSNAME}`}
              >
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

        <div className="mt-4 space-y-3">
          {magicError && (
            <div role="alert" className="bg-error-50 text-error-600 rounded-xl p-3 text-sm">{magicError}</div>
          )}
          <button
            type="button"
            onClick={handleMagicLinkClick}
            disabled={magicLoading || loading || !turnstileToken || cooldown > 0}
            className="w-full border border-[#ebebeb] rounded-full py-3 px-4 hover:bg-charcoal-50 transition-colors font-medium text-charcoal-700 text-sm disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {magicLoading
              ? isEn ? "Sending…" : "Envoi…"
              : isEn ? "Email me a sign-in link" : "Recevoir un lien de connexion par courriel"}
          </button>
        </div>
        </>
        )}

        <p className="mt-6 text-center text-sm text-charcoal-500">
          {t("noAccount")}{" "}
          <Link href={signupHref} className={TEXT_LINK_CLASSNAME}>
            {t("signupLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex-1 h-px bg-charcoal-200" />
      <span className="text-xs text-charcoal-400">{label}</span>
      <div className="flex-1 h-px bg-charcoal-200" />
    </div>
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

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
