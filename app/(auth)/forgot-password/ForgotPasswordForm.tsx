"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";
import { SITE_URL } from "@/lib/siteUrl";
import TurnstileWidget from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = "0x4AAAAAADun6nA4SV0GHTM6";

function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setLoading(true);
    setError("");
    // Token is single-use — clear before request so widget re-challenges on error
    const token = turnstileToken;
    setTurnstileToken(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      captchaToken: token,
      // Localisé (pas fixé à /reset-password) — corrige au passage l'écran
      // d'erreur qui s'affichait en français même pour un voyageur anglophone.
      redirectTo: `${SITE_URL}${localePath("/reset-password", locale)}`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  };

  const loginHref = localePath("/login", locale);

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
          <Link href={loginHref} className="mt-6 inline-block text-primary font-semibold text-sm hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

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
        <p className="text-charcoal-500 mb-8 text-sm">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder={t("emailPlaceholder")}
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

        <p className="mt-6 text-center text-sm text-charcoal-500">
          <Link href={loginHref} className="text-primary font-semibold hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordClient() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
