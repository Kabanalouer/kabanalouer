"use client";

import { useTranslations, useLocale } from "next-intl";
import AmenityIcon from "@/components/AmenityIcon";
import {
  AMENITY_PRIORITY_ORDER,
  getAmenityCatalogEntry,
  type AmenityValue,
} from "@/lib/amenities-catalog";

// Les 3 équipements les plus différenciants (voir AMENITY_PRIORITY_ORDER).
// Partagé avec AmenitiesSection.tsx, qui les retire de son aperçu.
export function pickHighlightAmenities(amenities: AmenityValue[]): AmenityValue[] {
  return [...amenities]
    .filter((a) => AMENITY_PRIORITY_ORDER.includes(a.id))
    .sort((a, b) => AMENITY_PRIORITY_ORDER.indexOf(a.id) - AMENITY_PRIORITY_ORDER.indexOf(b.id))
    .slice(0, 3);
}

// "Points forts du chalet" — teaser en haut de la fiche. Distinct de
// AmenitiesSection.tsx ("Ce que propose ce chalet", plus bas sur la page,
// avec le reste des équipements et le modal complet) — pas de bouton ici
// depuis le repositionnement du 2026-09-19. Mise en page en 3 colonnes
// (icône au-dessus) depuis le 2026-10-07. Encadré gris pâle, sans le résumé
// des détails (visible dans AmenitiesSection) depuis le 2026-10-11.
export default function ListingHighlights({ amenities }: { amenities: AmenityValue[] }) {
  const t = useTranslations("amenitiesSection");
  const locale = useLocale();

  const top3 = pickHighlightAmenities(amenities);

  if (top3.length === 0) return null;

  return (
    <section className="bg-charcoal-50 rounded-2xl p-6 sm:p-7">
      <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-5">{t("heading")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7">
        {top3.map((value, index) => {
          const entry = getAmenityCatalogEntry(value.id);
          if (!entry) return null;
          const label = locale === "en" ? entry.labelEn : entry.label;
          return (
            <div key={`${value.id}-${index}`} className="flex items-center sm:flex-col sm:items-start gap-3 min-w-0">
              <span className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-white shadow-sm">
                <AmenityIcon name={entry.icon} className="w-6 h-6 text-charcoal-800" />
              </span>
              <p className="text-base font-semibold text-charcoal-800 min-w-0">{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
