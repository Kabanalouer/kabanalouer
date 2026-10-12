"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { localePath } from "@/lib/localePath";
import {
  META_PIXEL_ENABLED,
  needsConsentChoice,
  onOpenConsentSettings,
  parseConsent,
  saveConsent,
  useConsentRaw,
} from "@/lib/consent";

// Bandeau de consentement (Loi 25) : petit encart en bas de l'écran, affiché
// tant que le visiteur n'a pas choisi, et rouvert par « Gérer mes cookies »
// (pied de page). « Refuser » aussi visible et aussi simple qu'« Accepter ».
// Sans pixel Meta : une seule question (mesure d'audience). Avec le pixel :
// mesure + publicité, et « Choisir » permet d'accepter l'une sans l'autre.
export default function ConsentBanner() {
  const t = useTranslations("consent");
  const locale = useLocale();
  const raw = useConsentRaw();
  const [reopened, setReopened] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [mesure, setMesure] = useState(false);
  const [publicite, setPublicite] = useState(false);

  useEffect(
    () =>
      onOpenConsentSettings(() => {
        setReopened(true);
        setChoosing(false);
      }),
    []
  );

  // raw === undefined : rendu serveur / avant lecture → rien (pas de flash)
  const current = raw === undefined ? null : parseConsent(raw);
  const visible = raw !== undefined && (reopened || needsConsentChoice(current));
  if (!visible) return null;

  const save = (choice: { mesure: boolean; publicite: boolean }) => {
    saveConsent(choice);
    setReopened(false);
    setChoosing(false);
  };
  const openChoices = () => {
    setMesure(!!current?.mesure);
    setPublicite(!!current?.publicite);
    setChoosing(true);
  };
  const button =
    "rounded-full border border-[#ebebeb] bg-white px-3.5 py-1.5 text-sm font-semibold text-charcoal-800 hover:border-charcoal-400 transition-colors";

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-lg rounded-2xl border border-[#ebebeb] bg-white px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
    >
      {choosing ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-charcoal-800">{t("chooseTitle")}</p>
          {[
            { checked: mesure, set: setMesure, title: t("mesureTitle"), desc: t("mesureDesc") },
            { checked: publicite, set: setPublicite, title: t("publiciteTitle"), desc: t("publiciteDesc") },
          ].map((row) => (
            <label key={row.title} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={row.checked}
                onChange={(e) => row.set(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium text-charcoal-800">{row.title}</span>
                <span className="block text-charcoal-400">{row.desc}</span>
              </span>
            </label>
          ))}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setChoosing(false)} className={button}>
              {t("back")}
            </button>
            <button type="button" onClick={() => save({ mesure, publicite })} className={button}>
              {t("save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm text-charcoal-600">
            {META_PIXEL_ENABLED ? t("textWithAds") : t("text")}{" "}
            <Link href={`${localePath("/confidentialite", locale)}#cookies`} className="font-medium text-charcoal-800 underline underline-offset-2">
              {t("learnMore")}
            </Link>
          </p>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => save({ mesure: false, publicite: false })} className={button}>
              {t("refuse")}
            </button>
            {META_PIXEL_ENABLED && (
              <button type="button" onClick={openChoices} className={button}>
                {t("choose")}
              </button>
            )}
            <button type="button" onClick={() => save({ mesure: true, publicite: true })} className={button}>
              {t("accept")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
