"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { NEARBY_BY_CATEGORY, getNearbyLabel } from "@/lib/nearbyActivities";

const VISIBLE_COUNT = 8;

// Saison par défaut selon la date du jour au Québec (même résultat côté
// serveur et navigateur) : décembre à mars = Hiver, avril à novembre = Été.
function currentSeason(): "Été" | "Hiver" {
  const month = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", month: "numeric" }).format(new Date()));
  return month === 12 || month <= 3 ? "Hiver" : "Été";
}

// « Quoi faire à proximité ? » — contrôle segmenté Été · Hiver · 4 saisons
// (onglets vides masqués) et activités en chips, 8 visibles puis « Voir les n activités ».
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

  const [selected, setSelected] = useState(() => {
    const preferred = currentSeason();
    return tabs.some((tab) => tab.cat === preferred) ? preferred : tabs[0]?.cat;
  });
  const [expanded, setExpanded] = useState(false);

  if (tabs.length === 0) return null;
  const current = tabs.find((tab) => tab.cat === selected) ?? tabs[0];
  const shown = expanded ? current.items : current.items.slice(0, VISIBLE_COUNT);

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
              onClick={() => { setSelected(tab.cat); setExpanded(false); }}
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
        {shown.map((a) => (
          <li key={a} className="rounded-full border border-[#e5e5e5] px-[14px] py-2 text-sm text-charcoal-700">
            {getNearbyLabel(a, locale)}
          </li>
        ))}
      </ul>

      {current.items.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-base font-semibold text-charcoal-800 underline underline-offset-4 hover:text-charcoal-600"
        >
          {expanded ? t("nearbyShowLess") : t("nearbyShowAll", { count: current.items.length })}
        </button>
      )}
    </div>
  );
}
