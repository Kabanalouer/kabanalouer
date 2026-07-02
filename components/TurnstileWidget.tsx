"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          language?: string;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Stable refs so the effect doesn't re-run when callbacks change identity
  const onSuccessRef = useRef(onSuccess);
  const onResetRef = useRef(onReset);
  onSuccessRef.current = onSuccess;
  onResetRef.current = onReset;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryRender = () => {
      if (window.turnstile && containerRef.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey,
          callback: (token) => onSuccessRef.current(token),
          "expired-callback": () => onResetRef.current(),
          "error-callback": () => onResetRef.current(),
          language: "fr",
          theme: "light",
        });
      } else if (!window.turnstile) {
        timeoutId = setTimeout(tryRender, 100);
      }
    };

    tryRender();

    return () => {
      clearTimeout(timeoutId);
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* widget already removed */ }
        widgetId.current = null;
      }
    };
  }, [sitekey]);

  return <div ref={containerRef} className="flex justify-center" />;
}
