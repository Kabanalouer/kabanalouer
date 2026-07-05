"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import TurnstileWidget from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = "0x4AAAAAADun6nA4SV0GHTM6";

type Role = "traveler" | "host";

function SignupForm() {
  const t = useTranslations("auth.signup");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const defaultHome = localePath("/", locale);
  const next = (() => {
    const n = searchParams.get("next") ?? defaultHome;
    return n.startsWith("/") ? n : defaultHome;
  })();
  const roleParam = searchParams.get("role") === "host" ? "host" : null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(roleParam ?? "traveler");
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setLoading(true);
    setError("");
    setAccountExists(false);
    // Token is single-use — clear before request so widget re-challenges on error
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
          role,
          preferred_language: locale,
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Supabase renvoie un user "fantôme" sans erreur quand l'email existe déjà
    // et est confirmé (comportement voulu pour ne pas révéler qui a un compte).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setAccountExists(true);
      setLoading(false);
      return;
    }
    setSuccess(true);
  };

  const handleGoogleSignup = async () => {
    const params = new URLSearchParams();
    if (next !== defaultHome) params.set("next", next);
    if (locale !== "fr") params.set("locale", locale);
    // queryParams go to Google's OAuth endpoint and are never returned — pass role in the callback URL instead
    if (role === "host") params.set("role", "host");
    const qs = params.toString();
    const callbackUrl = `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  };

  const loginHref = `${localePath("/login", locale)}${next !== defaultHome ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-charcoal-800 mb-3">{t("checkEmailTitle")}</h2>
          <p className="text-charcoal-500 text-sm leading-relaxed">
            {t.rich("checkEmailDesc", {
              email,
              strong: (chunks) => (
                <strong className="text-charcoal-800">{chunks}</strong>
              ),
            })}
          </p>
          {next !== defaultHome ? (
            <Link href={next} className="mt-6 inline-block text-primary font-semibold text-sm hover:underline">
              {t("backToListing")}
            </Link>
          ) : (
            <Link href={defaultHome} className="mt-6 inline-block text-primary font-semibold text-sm hover:underline">
              {t("backToHome")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-8 w-full max-w-md">
        <Link href={defaultHome} className="flex items-center justify-center mb-8" aria-label="Kabanalouer">
          <object
            type="image/svg+xml"
            data="/logo-wordmark.svg"
            aria-hidden="true"
            className="pointer-events-none"
            style={{ height: 60, width: "auto" }}
          />
        </Link>

        <h1 className="text-2xl font-bold text-charcoal-800 mb-1">{t("title")}</h1>
        <p className="text-charcoal-500 text-sm mb-6">
          {roleParam === "host" ? t("subtitleHost") : t("subtitleDefault")}
        </p>

        {/* Role selection */}
        {!roleParam && (
          <div className="mb-6 mt-6">
            <p className="text-sm font-medium text-charcoal-700 mb-3">{t("iAm")}</p>
            <div className="grid grid-cols-2 gap-3">
              <RoleButton
                selected={role === "traveler"}
                onClick={() => setRole("traveler")}
                icon={<LuggageIcon />}
                title={t("travelerTitle")}
                subtitle={t("travelerSubtitle")}
              />
              <RoleButton
                selected={role === "host"}
                onClick={() => setRole("host")}
                icon={<HomeIcon />}
                title={t("ownerTitle")}
                subtitle={t("ownerSubtitle")}
              />
            </div>
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 border border-[#ebebeb] rounded-full py-3 px-4 hover:bg-charcoal-50 transition-colors mb-6 font-medium text-charcoal-700 text-sm"
        >
          <GoogleIcon />
          {t("continueGoogle")}
        </button>

        <Divider label={t("or")} />

        <form onSubmit={handleSignup} className="space-y-4">
          {(error || accountExists) && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
              {accountExists ? (
                <>
                  {t("accountExists")}{" "}
                  <Link href={loginHref} className="font-semibold underline">
                    {t("accountExistsLoginLink")}
                  </Link>
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
            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("passwordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder={t("passwordPlaceholder")}
              minLength={8}
              required
            />
          </div>

          <TurnstileWidget
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

        <p className="mt-6 text-center text-xs text-charcoal-500">
          {t("alreadyAccount")}{" "}
          <Link href={loginHref} className="text-primary font-semibold hover:underline">
            {t("loginLink")}
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-charcoal-400">
          {t("termsNote")}{" "}
          <Link href={localePath("/conditions", locale)} className="underline hover:text-charcoal-600">
            {t("termsLink")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function RoleButton({ selected, onClick, icon, title, subtitle }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 rounded-xl p-4 text-left transition-all ${
        selected ? "border-primary bg-primary/5" : "border-[#ebebeb] hover:border-charcoal-300"
      }`}
    >
      <div className="mb-3">{icon}</div>
      <div className="font-semibold text-charcoal-800 text-sm">{title}</div>
      <div className="text-xs text-charcoal-500 mt-0.5">{subtitle}</div>
    </button>
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

function LuggageIcon() {
  return (
    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-9-2V3m2 2V3m-2 0h2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
