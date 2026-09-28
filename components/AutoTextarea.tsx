"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

// Champ de texte qui grandit avec son contenu (hauteur recalculée depuis
// scrollHeight, même technique que la description d'annonce) : jamais de
// défilement interne, seule la page défile — beaucoup plus simple sur
// mobile. `rows` donne la hauteur minimale ; `maxHeight` (px, optionnel)
// plafonne la croissance — au-delà seulement, le champ défile à l'intérieur
// (ex. zone de saisie de la messagerie).
type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { maxHeight?: number };

const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function AutoTextarea({ className = "", onInput, value, maxHeight, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      const full = el.scrollHeight;
      const capped = maxHeight !== undefined && full > maxHeight;
      el.style.height = `${capped ? maxHeight : full}px`;
      el.style.overflowY = capped ? "auto" : "hidden";
    }, [maxHeight]);

    useLayoutEffect(() => { resize(); }, [value, resize]);

    return (
      <textarea
        {...props}
        value={value}
        ref={(el) => {
          innerRef.current = el;
          if (typeof forwardedRef === "function") forwardedRef(el);
          else if (forwardedRef) forwardedRef.current = el;
        }}
        onInput={(e) => { resize(); onInput?.(e); }}
        className={`${className} resize-none`}
      />
    );
  }
);

export default AutoTextarea;
