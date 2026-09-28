"use client";

import { useTranslations } from "next-intl";

// Style commun aux calendriers de disponibilité (fiche publique + tableau de bord hôte)

export const BLOCKED_COLOR = "#FECACA"; // error-200

// Diagonale : arrivée = triangle bas-droite, départ = triangle haut-gauche
export const CHECKIN_BG  = `linear-gradient(to bottom right, transparent 50%, ${BLOCKED_COLOR} 50%)`;
export const CHECKOUT_BG = `linear-gradient(to bottom right, ${BLOCKED_COLOR} 50%, transparent 50%)`;

// Chaque nuit bloquée D occupe la moitié droite de D (arrivée) et la moitié
// gauche de D+1 (départ) — le jour de départ reste disponible pour une arrivée.
export function blockedBackground(nightBefore: boolean, nightOf: boolean): string | null {
  if (nightBefore && nightOf) return BLOCKED_COLOR;
  if (nightOf) return CHECKIN_BG;
  if (nightBefore) return CHECKOUT_BG;
  return null;
}

export function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AvailabilityLegend({ className = "" }: { className?: string }) {
  const t = useTranslations("availabilityView");
  const items = [
    { bg: null,          label: t("available"),   bordered: true },
    { bg: BLOCKED_COLOR, label: t("unavailable") },
    { bg: CHECKIN_BG,    label: t("checkin") },
    { bg: CHECKOUT_BG,   label: t("checkout") },
  ];
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-charcoal-400 ${className}`}>
      {items.map(({ bg, label, bordered }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`relative w-4 h-4 rounded overflow-hidden bg-white shrink-0 ${bordered ? "border border-[#ebebeb]" : ""}`}>
            {bg && <div className="absolute inset-0" style={{ background: bg }} />}
          </div>
          {label}
        </div>
      ))}
    </div>
  );
}
