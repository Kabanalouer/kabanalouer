"use client";

import { useState } from "react";
import { AMENITIES } from "@/lib/amenities";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function AmenitiesSection({ amenities }: { amenities: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const sorted = amenities
    .filter((a) => (AMENITIES as readonly string[]).includes(a))
    .sort((a, b) => AMENITIES.indexOf(a as never) - AMENITIES.indexOf(b as never));

  const top3 = sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  return (
    <div>
      <h2 className="font-semibold text-charcoal-800 mb-4">Points forts du chalet</h2>

      {/* Top 3 highlight cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {top3.map((a) => (
          <div key={a} className="flex flex-col items-center text-center p-4 bg-charcoal-50 rounded-xl border border-[#ebebeb]">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <CheckIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-charcoal-800 leading-snug">{a}</span>
          </div>
        ))}
      </div>

      {/* Full list (expanded) */}
      {hasMore && expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {sorted.map((a) => (
            <div key={a} className="flex items-center gap-2 text-sm text-charcoal-700">
              <CheckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Toggle button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/5 transition-colors"
        >
          {expanded
            ? "Réduire ↑"
            : `Voir toutes les caractéristiques (${sorted.length}) →`}
        </button>
      )}
    </div>
  );
}
