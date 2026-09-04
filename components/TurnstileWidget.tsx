"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { useLocale } from "next-intl";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          language?: string;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface Props {
  sitekey: string;
  onSuccess: (token: string) => void;
  onReset: () => void;
}

export default function TurnstileWidget({ sitekey, onSuccess, onReset }: Props) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Refs let the callbacks below capture the latest values without re-creating effects
  const onSuccessRef = useRef(onSuccess);
  const onResetRef = useRef(onReset);
  onSuccessRef.current = onSuccess;
  onResetRef.current = onReset;

  const render = useCallback(() => {
    if (window.turnstile && containerRef.current && !widgetId.current) {
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey,
        callback: (token: string) => onSuccessRef.current(token),
        "expired-callback": () => onResetRef.current(),
        "error-callback": () => onResetRef.current(),
        language: locale === "en" ? "en" : "fr",
        theme: "light",
      });
    }
  }, [sitekey, locale]);

  useEffect(() => {
    // Handles the case where window.turnstile is already loaded (cached script,
    // or component re-mounts after the script's onLoad already fired)
    render();

    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* already removed */ }
        widgetId.current = null;
      }
    };
  }, [render]);

  return (
    <>
      {/*
        Script lives here (not in the layout) so onLoad is reliable.
        Next.js deduplicates by src — only loads once even if multiple widgets exist.
        afterInteractive fires right after hydration, before browser idle.
      */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
