"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import ContactForm from "./ContactForm";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

// Distance (px) de glissement vers le bas au-delà de laquelle la feuille se ferme.
const DISMISS_THRESHOLD = 80;

// Bouton CTA de la barre fixe mobile — ouvre le même ContactForm que la
// colonne de droite desktop dans une feuille modale, plutôt qu'un lien
// d'ancrage vers un élément masqué sur mobile (`hidden lg:block`), qui ne
// menait jamais nulle part.
export default function MobileContactTrigger({
  label,
  ...contactFormProps
}: { label: string } & React.ComponentProps<typeof ContactForm>) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useBodyScrollLock(open);

  const close = () => { setOpen(false); setDragY(0); setDragging(false); dragStart.current = null; };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setDragY(0); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Glisser vers le bas sur la poignée / l'en-tête pour fermer.
  const onTouchStart = (e: React.TouchEvent) => { dragStart.current = e.touches[0].clientY; setDragging(true); };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onTouchEnd = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragging(false);
    if (dragY > DISMISS_THRESHOLD) close();
    else setDragY(0);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-white px-5 py-2.5 min-h-[44px] rounded-full font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center"
      >
        {label}
      </button>

      {/* Portail vers <body> : la barre fixe parente crée un contexte
          d'empilement (z-40) qui laissait la barre de navigation (z-50)
          par-dessus le fond assombri. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div
            className={`relative bg-white w-full rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col ${dragging ? "" : "transition-transform duration-200"}`}
            style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
          >
            {/* En-tête : poignée + fermer, zone de glissement */}
            <div
              className="relative shrink-0 h-12 pt-3 touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={onTouchEnd}
            >
              <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto" />
              <button
                type="button"
                onClick={close}
                aria-label={tc("close")}
                className="absolute top-1 right-2 w-11 h-11 flex items-center justify-center rounded-full text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <ContactForm {...contactFormProps} hideMessage inlinePanels />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
