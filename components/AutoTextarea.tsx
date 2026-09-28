"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

// Champ de texte qui grandit avec son contenu (hauteur recalculée depuis
// scrollHeight, même technique que la description d'annonce) : jamais de
// défilement interne, seule la page défile — beaucoup plus simple sur
// mobile. `rows` donne la hauteur minimale.
const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoTextarea({ className = "", onInput, value, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

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
        className={`${className} resize-none overflow-hidden`}
      />
    );
  }
);

export default AutoTextarea;
