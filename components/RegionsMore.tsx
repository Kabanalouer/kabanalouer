"use client";

import { useState, type ReactNode } from "react";

// Accueil, « Explorer par région » : les régions au-delà des 8 premières restent dans le HTML (maillage
// interne), cachées jusqu'au clic ; le bouton reste sous la grille, ouverte ou non.
export default function RegionsMore({ children, openLabel, closeLabel }: { children: ReactNode; openLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div hidden={!open} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mx-auto mt-6 flex w-fit items-center justify-center rounded-full border border-charcoal-300 bg-white px-6 py-3 text-sm font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors"
      >
        {open ? closeLabel : openLabel}
      </button>
    </>
  );
}
