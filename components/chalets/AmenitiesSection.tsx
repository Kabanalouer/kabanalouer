"use client";

import { useState } from "react";

const AMENITY_EMOJI: Record<string, string> = {
  "Bord de l'eau":                              "🌊",
  "Piscine intérieure":                         "🏊",
  "Piscine extérieure":                         "🏊",
  "Ski in / Ski out":                           "⛷️",
  "Situé sur un resort":                        "🏔️",
  "Spa":                                        "♨️",
  "Sauna":                                      "🧖",
  "Chalet en bois rond":                        "🪵",
  "Foyer intérieur au bois":                    "🔥",
  "Foyer extérieur (firepit)":                  "🔥",
  "BBQ":                                        "🍖",
  "Table de billard":                           "🎱",
  "Babyfoot":                                   "⚽",
  "Table de ping-pong":                         "🏓",
  "Arcades":                                    "🕹️",
  "Jeux de société":                            "🎲",
  "Livres et Revues":                           "📚",
  "Gym":                                        "💪",
  "Wifi":                                       "📶",
  "Espace de travail dédié (télétravail)":      "💻",
  "Climatisation":                              "❄️",
  "Télévision avec câble":                      "📺",
  "Télévision intelligente":                    "📺",
  "Système audio (musique)":                    "🎵",
  "Cuisine complète avec vaisselle et chaudrons": "🍳",
  "Literie et serviettes incluses":             "🛏️",
  "Buanderie":                                  "👕",
  "Terrasse":                                   "🪑",
  "Module de jeux pour enfant":                 "🛝",
  "Borne de recharge pour véhicule électrique": "⚡",
};

export default function AmenitiesSection({ amenities }: { amenities: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const top3 = amenities.slice(0, 3);
  const hasMore = amenities.length > 3;

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Caractéristiques du chalet</h2>

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
          {amenities.map((a) => (
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
            : `Voir toutes les caractéristiques (${amenities.length}) →`}
        </button>
      )}
    </div>
  );
}
