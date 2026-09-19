import AmenityIcon from "@/components/AmenityIcon";
import { getAmenityCatalogEntry, summarizeAmenityDetails, type AmenityValue } from "@/lib/amenities-catalog";

// Ligne icône + nom + résumé des détails, partagée entre ListingHighlights.tsx
// ("Points forts", en haut de la fiche) et AmenitiesSection.tsx ("Ce que
// propose ce chalet", plus bas), pour ne pas dupliquer ce rendu.
export default function AmenityRow({ value, locale }: { value: AmenityValue; locale: string }) {
  const entry = getAmenityCatalogEntry(value.id);
  if (!entry) return null;
  const label = locale === "en" ? entry.labelEn : entry.label;
  const summary = summarizeAmenityDetails(entry, value.details, locale);

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="shrink-0 text-charcoal-800 mt-0.5">
        <AmenityIcon name={entry.icon} className="w-[22px] h-[22px]" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-charcoal-800 text-sm">{label}</p>
        {summary && <p className="text-sm text-charcoal-400 mt-0.5">{summary}</p>}
      </div>
    </div>
  );
}
