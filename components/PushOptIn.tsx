"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Status =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function detectStatus(): Promise<Status> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) {
    // Safari iPhone n'expose PushManager que dans l'app ajoutée à l'écran d'accueil
    return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

export default function PushOptIn() {
  const t = useTranslations("push");
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus("off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        await subscription.unsubscribe().catch(() => {});
        setError(data.error ?? t("error"));
        setStatus("off");
        return;
      }
      setStatus("on");
    } catch (err) {
      console.error("[PushOptIn] activation impossible", err);
      setError(t("error"));
      setStatus(Notification.permission === "denied" ? "denied" : "off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("off");
    } catch (err) {
      console.error("[PushOptIn] désactivation impossible", err);
      setError(t("disableError"));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <div className="h-12" aria-hidden="true" />;
  }

  if (status === "ios-install") {
    return <p className="text-sm text-charcoal-500">{t("iosHint")}</p>;
  }

  if (status === "unsupported" || status === "not-configured") {
    return (
      <p className="text-sm text-charcoal-500">
        {status === "unsupported" ? t("unsupported") : t("notConfigured")}
      </p>
    );
  }

  const isOn = status === "on";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-charcoal-800">{t("label")}</p>
          <p className="text-xs text-charcoal-400 mt-0.5">
            {isOn ? t("statusOn") : status === "denied" ? t("statusBlocked") : t("statusOff")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label={t("label")}
          onClick={isOn ? disable : enable}
          disabled={busy || status === "denied"}
          className={[
            "relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 disabled:opacity-50",
            isOn ? "bg-primary" : "bg-charcoal-200",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
              isOn ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>
      {status === "denied" && (
        <p className="text-sm text-warning-700 bg-warning-50 border border-warning-100 rounded-xl px-4 py-3">
          {t("deniedHelp")}
        </p>
      )}
      {error && <p className="text-sm text-error-600">{error}</p>}
    </div>
  );
}
