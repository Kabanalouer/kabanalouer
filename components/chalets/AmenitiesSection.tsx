"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import AmenityRow from "./AmenityRow";
import {
  AMENITY_PRIORITY_ORDER,
  groupAmenitiesByCategory,
  type AmenityValue,
} from "@/lib/amenities-catalog";

const TOP_COUNT = 10;

function AllAmenitiesModal({
  amenities,
  locale,
  title,
  onClose,
}: {
  amenities: AmenityValue[];
  locale: string;
  title: string;
  onClose: () => void;
}) {
  const isEn = locale === "en";
  const groups = groupAmenitiesByCategory(amenities);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb] shrink-0">
          <h3 className="text-heading-3 font-bold text-charcoal-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            title={isEn ? "Close" : "Fermer"}
            className="p-1.5 rounded-full hover:bg-charcoal-50 transition-colors text-charcoal-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {groups.map(({ category, items }) => (
            <div key={category.id}>
              <h4 className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-1">
                {isEn ? category.labelEn : category.label}
              </h4>
              <div className="divide-y divide-[#ebebeb]">
                {items.map((value, index) => (
                  <AmenityRow key={`${value.id}-${index}`} value={value} locale={locale} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AmenitiesSection({ amenities }: { amenities: AmenityValue[] }) {
  const [showAll, setShowAll] = useState(false);
  const t = useTranslations("amenitiesSection");
  const locale = useLocale();

  const known = amenities.filter((a) => AMENITY_PRIORITY_ORDER.includes(a.id));
  const sorted = [...known].sort(
    (a, b) => AMENITY_PRIORITY_ORDER.indexOf(a.id) - AMENITY_PRIORITY_ORDER.indexOf(b.id)
  );

  if (sorted.length === 0) return null;

  const top10 = sorted.slice(0, TOP_COUNT);
  const hasMore = sorted.length > TOP_COUNT;
  const title = t("fullTitle");

  return (
    <div>
      <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-4">{title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8 divide-y divide-[#ebebeb] sm:divide-y-0">
        {top10.map((value, index) => (
          <AmenityRow key={`${value.id}-${index}`} value={value} locale={locale} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 text-base font-medium text-primary border border-primary/30 px-5 py-2.5 rounded-full hover:bg-primary/5 transition-colors"
        >
          {t("showAllButton", { count: sorted.length })}
        </button>
      )}

      {showAll && (
        <AllAmenitiesModal
          amenities={sorted}
          locale={locale}
          title={title}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}
