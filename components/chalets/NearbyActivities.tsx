"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { NEARBY_BY_CATEGORY, getNearbyLabel } from "@/lib/nearbyActivities";

// « Quoi faire à proximité ? » — contrôle segmenté Été · Hiver · 4 saisons
// (onglets vides masqués, Été par défaut) et toutes les activités en chips.
export default function NearbyActivities({ activities }: { activities: string[] }) {
  const t = useTranslations("listing");
  const locale = useLocale();

  const labels: Record<string, string> = {
    "Été": t("nearbySummer"),
    "Hiver": t("nearbyWinter"),
    "4 saisons": t("nearbyAllSeason"),
  };
  const tabs = Object.entries(NEARBY_BY_CATEGORY)
    .map(([cat, items]) => ({ cat, items: items.filter((i) => activities.includes(i)) }))
    .filter((tab) => tab.items.length > 0);

  const [selected, setSelected] = useState(() => (tabs.some((tab) => tab.cat === "Été") ? "Été" : tabs[0]?.cat));

  if (tabs.length === 0) return null;
  const current = tabs.find((tab) => tab.cat === selected) ?? tabs[0];

  return (
    <div>
      <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-1">{t("nearbyTitle")}</h2>
      <p className="text-sm text-charcoal-400 mb-4">{t("nearbySubtitle")}</p>

      <div role="tablist" aria-label={t("nearbyTitle")} className="inline-flex rounded-full bg-[#f2f2f2] p-1 mb-5">
        {tabs.map((tab) => {
          const active = tab.cat === current.cat;
          return (
            <button
              key={tab.cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(tab.cat)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                active ? "bg-white font-semibold text-charcoal-800 shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "font-medium text-charcoal-400 hover:text-charcoal-700"
              }`}
            >
              {labels[tab.cat] ?? tab.cat}
            </button>
          );
        })}
      </div>

      <ul role="tabpanel" className="flex flex-wrap gap-2">
        {current.items.map((a) => (
          <li key={a} className="rounded-full border border-[#e5e5e5] px-[14px] py-2 text-sm text-charcoal-700">
            {getNearbyLabel(a, locale)}
          </li>
        ))}
      </ul>
    </div>
  );
}
