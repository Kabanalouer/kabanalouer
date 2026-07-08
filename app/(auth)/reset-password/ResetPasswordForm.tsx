"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";

type Status = "checking" | "ready" | "invalid";

function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setStatus("ready");
      else if (mounted) setStatus((s) => (s === "checking" ? "invalid" : s));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
  };

  const loginHref = localePath("/login", locale);
  const forgotPasswordHref = localePath("/forgot-password", locale);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-50 px-4">
        <p className="text-charcoal-400 text-sm">{t("checking")}</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-charcoal-800 mb-3">{t("invalidTitle")}</h2>
          <p className="text-charcoal-500 text-sm leading-relaxed mb-6">{t("invalidDesc")}</p>
          <Link href={forgotPasswordHref} className="text-primary font-semibold text-sm hover:underline">
            {t("requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#ebebeb] p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-charcoal-800 mb-3">{t("successTitle")}</h2>
          <p className="text-charcoal-500 text-sm leading-relaxed mb-6">{t("successDesc")}</p>
          <button
            onClick={() => router.push(loginHref)}
            className="bg-primary text-white py-3 px-8 rounded-full font-semibold hover:bg-primary-dark transition-colors text-sm"
          >
            {t("goToLogin")}
          </button>
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
              {t("newPasswordLabel")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#ebebeb] rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
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
