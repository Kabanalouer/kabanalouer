"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import AmenityIcon from "@/components/AmenityIcon";
import {
  AMENITY_PRIORITY_ORDER,
  getAmenityCatalogEntry,
  summarizeAmenityDetails,
  type AmenityValue,
} from "@/lib/amenities-catalog";

function AmenityRow({ value, locale }: { value: AmenityValue; locale: string }) {
  const entry = getAmenityCatalogEntry(value.id);
  if (!entry) return null;
  const label = locale === "en" ? entry.labelEn : entry.label;
  const summary = summarizeAmenityDetails(entry, value.details, locale);

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="shrink-0 text-charcoal-800 mt-0.5">
        <AmenityIcon name={entry.icon} className="w-[22px] h-[22px]" />
      </div>
      <div>
        <p className="font-semibold text-charcoal-800 text-sm">{label}</p>
        {summary && <p className="text-sm text-charcoal-400 mt-0.5">{summary}</p>}
      </div>
    </div>
  );
}

export default function AmenitiesSection({ amenities }: { amenities: AmenityValue[] }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("amenitiesSection");
  const locale = useLocale();

  const known = amenities.filter((a) => AMENITY_PRIORITY_ORDER.includes(a.id));
  const sorted = [...known].sort(
    (a, b) => AMENITY_PRIORITY_ORDER.indexOf(a.id) - AMENITY_PRIORITY_ORDER.indexOf(b.id)
  );

  const top3 = sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  return (
    <div>
      <h2 className="font-semibold text-charcoal-800 mb-1">{t("heading")}</h2>

      <div className="divide-y divide-[#ebebeb]">
        {(expanded ? sorted : top3).map((value) => (
          <AmenityRow key={value.id} value={value} locale={locale} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/5 transition-colors"
        >
          {expanded ? t("showLess") : t("showAll", { count: sorted.length })}
        </button>
      )}
    </div>
  );
}
