"use client";

import { useState } from "react";
import { AMENITIES, AMENITY_EMOJI } from "@/lib/amenities";

export default function AmenitiesSection({ amenities }: { amenities: string[] }) {
  const [expanded, setExpanded] = useState(false);

  // Keep only items in the canonical list, then sort by official order
  const sorted = amenities
    .filter((a) => (AMENITIES as readonly string[]).includes(a))
    .sort((a, b) => AMENITIES.indexOf(a as never) - AMENITIES.indexOf(b as never));

  const top3 = sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Points forts du chalet</h2>

      {/* Top 3 highlight cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {top3.map((a) => (
          <div key={a} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-3xl mb-2">{AMENITY_EMOJI[a] ?? "✓"}</span>
            <span className="text-sm font-semibold text-gray-900 leading-snug">{a}</span>
          </div>
        ))}
      </div>

      {/* Full list (expanded) */}
      {hasMore && expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {sorted.map((a) => (
            <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-base">{AMENITY_EMOJI[a] ?? "✓"}</span>
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Toggle button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors"
        >
          {expanded
            ? "Réduire ↑"
            : `Voir toutes les caractéristiques (${sorted.length}) →`}
        </button>
      )}
    </div>
  );
}
