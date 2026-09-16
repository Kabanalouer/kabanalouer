"use client";

import { NEARBY_BY_CATEGORY, getNearbyLabel } from "@/lib/nearbyActivities";
import { useLocale } from "next-intl";

export default function NearbyActivitiesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (activities: string[]) => void;
}) {
  const locale = useLocale();
  const toggle = (activity: string) => {
    if (selected.includes(activity)) {
      onChange(selected.filter((a) => a !== activity));
    } else {
      onChange([...selected, activity]);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(NEARBY_BY_CATEGORY).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-charcoal-400 tracking-wide mb-3">
            {category}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item) => {
              const active = selected.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    active
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-charcoal-100 text-charcoal-700 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(item)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition-colors ${
                      active ? "bg-primary border-primary" : "border-charcoal-300"
                    }`}
                  >
                    {active && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${active ? "font-medium" : ""}`}>{getNearbyLabel(item, locale)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
