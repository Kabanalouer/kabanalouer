"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

// Contenu libre écrit par un utilisateur (avis, réponse du proprio) : affiché
// dans la langue du lecteur quand une traduction automatique existe, avec un
// lien pour revenir au texte original.
export default function TranslatedText({
  original, lang, translated, className,
}: {
  original: string;
  lang: string | null | undefined;
  translated: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("translatedText");
  const locale = useLocale();
  const [showOriginal, setShowOriginal] = useState(false);
  const canTranslate = !!translated && !!lang && lang !== (locale === "en" ? "en" : "fr");

  if (!canTranslate) return <p className={className}>{original}</p>;

  return (
    <div>
      <p className={className}>{showOriginal ? original : translated}</p>
      <p className="mt-1 text-xs text-charcoal-400">
        {!showOriginal && <>{t("autoTranslated")} · </>}
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="underline underline-offset-2 hover:text-charcoal-700"
        >
          {showOriginal ? t("showTranslation") : t("showOriginal")}
        </button>
      </p>
    </div>
  );
}
