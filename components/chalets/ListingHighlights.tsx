"use client";

import { useTranslations, useLocale } from "next-intl";
import AmenityIcon from "@/components/AmenityIcon";
import {
  AMENITY_PRIORITY_ORDER,
  getAmenityCatalogEntry,
  summarizeAmenityDetails,
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
// (icône au-dessus) depuis le 2026-10-07.
export default function ListingHighlights({ amenities }: { amenities: AmenityValue[] }) {
  const t = useTranslations("amenitiesSection");
  const locale = useLocale();

  const top3 = pickHighlightAmenities(amenities);

  if (top3.length === 0) return null;

  return (
    <div>
      <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-5">{t("heading")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-7">
        {top3.map((value, index) => {
          const entry = getAmenityCatalogEntry(value.id);
          if (!entry) return null;
          const label = locale === "en" ? entry.labelEn : entry.label;
          const summary = summarizeAmenityDetails(entry, value.details, locale);
          return (
            <div key={`${value.id}-${index}`} className="flex flex-col gap-2 min-w-0">
              <AmenityIcon name={entry.icon} className="w-6 h-6 text-charcoal-800" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-charcoal-800">{label}</p>
                {summary && <p className="text-sm text-charcoal-400 mt-0.5">{summary}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
