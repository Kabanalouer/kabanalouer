"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ContactForm from "./ContactForm";

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl max-h-[88vh] overflow-y-auto p-5 pt-4">
            <div className="w-10 h-1 bg-charcoal-200 rounded-full mx-auto mb-4" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tc("close")}
              className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ContactForm {...contactFormProps} hideMessage />
          </div>
        </div>
      )}
    </>
  );
}
