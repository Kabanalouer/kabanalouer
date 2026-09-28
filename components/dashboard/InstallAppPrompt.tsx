"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { localePath } from "@/lib/localePath";

// Invitation à installer Kabanalouer comme application (PWA), affichée aux
// proprios dans le tableau de bord — ce sont eux qui profitent le plus des
// notifications de nouveaux messages.
// - Android / Chrome : bouton qui déclenche l'invite native (beforeinstallprompt)
// - iPhone / iPad (Safari) : les 3 étapes « Partager → Sur l'écran d'accueil »
// - Déjà installée : propose d'activer les notifications si ce n'est pas fait
// « Plus tard » masque l'invitation 30 jours sur cet appareil.

const DISMISS_KEY = "kbl-install-prompt-dismissed-at";
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "hidden" | "android" | "ios" | "enable-push";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

export default function InstallAppPrompt() {
  const locale = useLocale();
  const isEn = locale === "en";
  const [mode, setMode] = useState<Mode>("hidden");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (recentlyDismissed()) return;

    // Détection faite après le premier rendu (le serveur ne connaît ni
    // l'appareil ni le mode d'affichage) — hors du corps de l'effet.
    if (isStandalone()) {
      const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!pushSupported || Notification.permission !== "default") return;
      const id = requestAnimationFrame(() => setMode("enable-push"));
      return () => cancelAnimationFrame(id);
    }

    if (isIos()) {
      const id = requestAnimationFrame(() => setMode("ios"));
      return () => cancelAnimationFrame(id);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* navigation privée */ }
    setMode("hidden");
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setMode("hidden");
  };

  if (mode === "hidden") return null;

  const title = mode === "enable-push"
    ? (isEn ? "Turn on message notifications" : "Activez les notifications de messages")
    : (isEn ? "Install the Kabanalouer app" : "Installez l’application Kabanalouer");
  const text = mode === "enable-push"
    ? (isEn
        ? "Get a notification on this device as soon as a traveler writes to you. Replying quickly helps your listing rank higher."
        : "Recevez une notification sur cet appareil dès qu’un voyageur vous écrit. Répondre rapidement aide votre annonce à mieux se classer.")
    : (isEn
        ? "Open Kabanalouer from your home screen and get a notification for every new message — free, nothing to download from a store."
        : "Ouvrez Kabanalouer depuis votre écran d’accueil et recevez une notification à chaque nouveau message — gratuit, rien à télécharger dans une boutique d’applications.");

  return (
    <div className="mb-6 bg-white rounded-2xl border border-[#ebebeb] p-4 sm:p-5 flex gap-4 items-start">
      <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="w-12 h-12 rounded-xl shrink-0 border border-[#ebebeb]" />
      <div className="flex-1 min-w-0">
        <p className="text-heading-3 font-semibold text-charcoal-800">{title}</p>
        <p className="text-base text-charcoal-500 mt-1">{text}</p>

        {mode === "ios" && (
          <ol className="mt-3 space-y-2 text-base text-charcoal-700">
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span className="flex items-center gap-1.5 flex-wrap">
                {isEn ? "Tap" : "Touchez"}
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-label={isEn ? "Share" : "Partager"}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                </svg>
                {isEn ? "Share in Safari" : "Partager dans Safari"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
              {isEn ? "Choose “Add to Home Screen”" : "Choisissez « Sur l’écran d’accueil »"}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
              {isEn ? "Open Kabanalouer from its icon" : "Ouvrez Kabanalouer depuis son icône"}
            </li>
          </ol>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {mode === "android" && (
            <button
              type="button"
              onClick={() => void install()}
              className="min-h-[44px] px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              {isEn ? "Install the app" : "Installer l’application"}
            </button>
          )}
          {mode === "enable-push" && (
            <Link
              href={`${localePath("/dashboard/profile", locale)}#notifications-appareil`}
              className="min-h-[44px] px-5 inline-flex items-center rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              {isEn ? "Turn on notifications" : "Activer les notifications"}
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] px-4 rounded-full text-sm font-semibold text-charcoal-500 hover:text-charcoal-800 hover:bg-charcoal-50 transition-colors"
          >
            {isEn ? "Later" : "Plus tard"}
          </button>
        </div>
      </div>
    </div>
  );
}
