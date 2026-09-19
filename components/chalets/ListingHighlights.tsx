"use client";

import { useTranslations, useLocale } from "next-intl";
import AmenityRow from "./AmenityRow";
import { AMENITY_PRIORITY_ORDER, type AmenityValue } from "@/lib/amenities-catalog";

// "Points forts du chalet" — teaser en haut de la fiche, les 3 équipements les
// plus différenciants (voir AMENITY_PRIORITY_ORDER). Distinct de
// AmenitiesSection.tsx ("Ce que propose ce chalet", plus bas sur la page,
// avec le reste des équipements et le modal complet) — pas de bouton ici
// depuis le repositionnement du 2026-09-19.
export default function ListingHighlights({ amenities }: { amenities: AmenityValue[] }) {
  const t = useTranslations("amenitiesSection");
  const locale = useLocale();

  const top3 = [...amenities]
    .filter((a) => AMENITY_PRIORITY_ORDER.includes(a.id))
    .sort((a, b) => AMENITY_PRIORITY_ORDER.indexOf(a.id) - AMENITY_PRIORITY_ORDER.indexOf(b.id))
    .slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-charcoal-800 mb-1">{t("heading")}</h2>
      <div className="divide-y divide-[#ebebeb]">
        {top3.map((value, index) => (
          <AmenityRow key={`${value.id}-${index}`} value={value} locale={locale} />
        ))}
      </div>
    </div>
  );
}
