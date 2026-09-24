"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TEXT_LINK_CLASSNAME } from "@/lib/textLinkClassName";

type Lang = "fr" | "en";
type FieldType = "title" | "description" | "caption" | "roomName" | "bio";
type Variant = "pill" | "link" | "icon" | "text";

interface TranslateButtonProps {
  sourceText: string;
  sourceLang: Lang;
  targetLang: Lang;
  fieldType: FieldType;
  onTranslated: (translation: string) => void;
  disabled?: boolean;
  variant?: Variant;
  // Libellé au repos (hors chargement) — sinon le texte générique "Traduire".
  // Permet à un usage précis (ex. "Traduire depuis le français") de rester
  // cohérent avec le reste du formulaire sans dupliquer ce composant.
  label?: string;
  // Message d'erreur personnalisé — sinon le message générique.
  errorMessage?: string;
}

// Bouton texte discret réutilisé pour toute action d'aide sur un champ
// (traduction, génération IA...) — même composant, même poids visuel,
// voir design_handoff_traduction_titre/README.md.
export const HELPER_BUTTON_CLASSNAME =
  "inline-flex items-center gap-[7px] min-h-[44px] px-2.5 rounded-lg text-sm font-semibold text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

const VARIANT_CLASSNAME: Record<Variant, string> = {
  pill:
    "inline-flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-full px-4 py-2 transition-colors disabled:opacity-50",
  link: `inline-flex items-center gap-1.5 text-xs disabled:opacity-50 ${TEXT_LINK_CLASSNAME}`,
  icon: "shrink-0 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40",
  text: HELPER_BUTTON_CLASSNAME,
};

const ICON_SIZE: Record<Variant, string> = {
  pill: "w-4 h-4",
  link: "w-3.5 h-3.5",
  icon: "w-3.5 h-3.5",
  text: "w-4 h-4",
};

// Icône "traduction" (Heroicons outline "language"), cohérente avec le reste
// du projet — SVG inline uniquement, jamais de librairie d'icônes externe.
function TranslateIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"
      />
    </svg>
  );
}

function Spinner({ className }: { className: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function TranslateButton({
  sourceText,
  sourceLang,
  targetLang,
  fieldType,
  onTranslated,
  disabled = false,
  variant = "pill",
  label,
  errorMessage,
}: TranslateButtonProps) {
  const t = useTranslations("translateButton");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDisabled = disabled || loading || sourceText.trim().length === 0;
  const idleLabel = label ?? t("translate");

  const handleClick = async () => {
    if (isDisabled) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, sourceLang, targetLang, fieldType }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Message précis du serveur (ex. limite de débit atteinte) plutôt que
        // le texte générique — plus utile pour comprendre un vrai échec.
        setError(data.error ?? errorMessage ?? t("error"));
        return;
      }
      onTranslated(data.translation);
    } catch {
      // Échec réseau/parsing sans message exploitable côté serveur — le texte
      // générique reste préférable à une erreur JS brute.
      setError(errorMessage ?? t("error"));
    } finally {
      setLoading(false);
    }
  };

  const iconClass = ICON_SIZE[variant];
  const displayLabel = loading ? t("translating") : idleLabel;

  return (
    <div className={variant === "icon" ? "inline-flex flex-col" : "inline-flex flex-col items-start"}>
      <button
        type="button"
        title={idleLabel}
        // Empêche le blur du champ voisin (ex. légende) de se déclencher avant
        // le clic — sans ça, un onBlur qui sauvegarde/valide peut faire perdre
        // le premier clic (le focus bouge, mais le clic n'est pas traité).
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        disabled={isDisabled}
        className={VARIANT_CLASSNAME[variant]}
      >
        {loading ? <Spinner className={iconClass} /> : <TranslateIcon className={iconClass} />}
        {variant !== "icon" && displayLabel}
      </button>
      {error && <p className="text-xs text-error-500 mt-1">{error}</p>}
    </div>
  );
}
