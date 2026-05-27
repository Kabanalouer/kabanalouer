"use client";

import { useState } from "react";
import { AMENITIES } from "@/lib/amenities";

type AmenityConfig = { icon: React.ReactNode; description: string };

const AMENITY_CONFIG: Record<string, AmenityConfig> = {
  "Bord de l'eau": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.5-2.5 3-2.5 4.5 0s3 2.5 4.5 0 3-2.5 4.5 0 3 2.5 4.5 0" />
        <path d="M2 17c1.5-2.5 3-2.5 4.5 0s3 2.5 4.5 0 3-2.5 4.5 0 3 2.5 4.5 0" />
      </svg>
    ),
    description: "Accès direct au bord de l'eau depuis le chalet",
  },
  "Piscine intérieure": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
        <path d="M7 5a2 2 0 100 4 2 2 0 000-4z" />
        <path d="M7 9v4M14 10l3-3 3 3v4" />
      </svg>
    ),
    description: "Piscine intérieure chauffée disponible sur place",
  },
  "Piscine extérieure": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
        <path d="M7 5a2 2 0 100 4 2 2 0 000-4z" />
        <path d="M7 9v4M14 10l3-3 3 3v4" />
      </svg>
    ),
    description: "Piscine extérieure disponible sur place",
  },
  "Ski in / Ski out": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20L12 4l9 16H3z" />
        <path d="M12 4v6" />
      </svg>
    ),
    description: "Accès direct aux pistes depuis le chalet",
  },
  "Situé sur un resort": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20L12 4l9 16H3z" />
        <path d="M9 20v-5a3 3 0 016 0v5" />
      </svg>
    ),
    description: "Chalet situé à l'intérieur d'un resort avec services",
  },
  "Spa": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" />
        <path d="M12 12C12 7 7 5 7 2c0 5 5 7 5 10z" />
        <path d="M12 12C12 7 17 5 17 2c0 5-5 7-5 10z" />
        <path d="M5 22c0-4 3-7 7-10 4 3 7 6 7 10H5z" />
      </svg>
    ),
    description: "Spa privatif pour une détente optimale",
  },
  "Sauna": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v2M12 2v3M16 3v2" />
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M7 13h10M7 17h6" />
      </svg>
    ),
    description: "Sauna disponible pour vous détendre après vos activités",
  },
  "Chalet en bois rond": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    ),
    description: "Construction authentique en bois rond",
  },
  "Foyer intérieur au bois": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c0 4.5-5 6.5-5 11a5 5 0 0010 0c0-4.5-5-6.5-5-11z" />
        <path d="M12 12c0 2-2 3-2 4.5a2 2 0 004 0c0-1.5-2-2.5-2-4.5z" />
      </svg>
    ),
    description: "Soirées cocooning au coin du feu",
  },
  "Foyer extérieur (firepit)": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c0 4.5-5 6.5-5 11a5 5 0 0010 0c0-4.5-5-6.5-5-11z" />
        <path d="M8 21h8" />
        <path d="M12 18v3" />
      </svg>
    ),
    description: "Feu de camp extérieur pour les soirées étoilées",
  },
  "BBQ": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="11" r="5" />
        <path d="M5.5 11H2M22 11h-3.5M12 18v4M8 22h8" />
        <path d="M9 9l1.5 2M13 9l1.5 2" />
      </svg>
    ),
    description: "BBQ extérieur pour vos repas en plein air",
  },
  "Table de billard": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="7" cy="9" r="1.5" />
        <circle cx="17" cy="15" r="1.5" />
        <path d="M9.1 10.1l5.8 3.8" />
      </svg>
    ),
    description: "Table de billard pour les soirées entre amis",
  },
  "Babyfoot": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M8 5v14M16 5v14" />
        <circle cx="8" cy="11" r="1.5" />
        <circle cx="16" cy="13" r="1.5" />
      </svg>
    ),
    description: "Table de baby-foot pour s'amuser en famille",
  },
  "Table de ping-pong": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="9" width="20" height="11" rx="1" />
        <path d="M12 9v11M2 15h20" />
        <circle cx="17" cy="5" r="2.5" />
      </svg>
    ),
    description: "Table de ping-pong pour les amateurs de sport",
  },
  "Arcades": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <circle cx="12" cy="8" r="2" />
        <circle cx="9" cy="15" r="1" />
        <circle cx="15" cy="15" r="1" />
        <circle cx="12" cy="18" r="1" />
      </svg>
    ),
    description: "Jeux d'arcades pour les soirées en famille",
  },
  "Jeux de société": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="9" height="9" rx="1.5" />
        <rect x="13" y="2" width="9" height="9" rx="1.5" />
        <rect x="2" y="13" width="9" height="9" rx="1.5" />
        <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
        <path d="M17 16h4M19 14v4" />
      </svg>
    ),
    description: "Large sélection de jeux de société sur place",
  },
  "Livres et Revues": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
    description: "Collection de livres et revues à disposition",
  },
  "Gym": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16" />
        <path d="M2 8h4M18 8h4" />
        <path d="M2 16h4M18 16h4" />
        <path d="M6 12h12" />
      </svg>
    ),
    description: "Salle de gym équipée pour rester en forme",
  },
  "Wifi": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0114.08 0" />
        <path d="M1.42 9a16 16 0 0121.16 0" />
        <path d="M8.53 16.11a6 6 0 016.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    description: "Connexion Wifi haute vitesse incluse",
  },
  "Espace de travail dédié (télétravail)": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    description: "Bureau dédié pour travailler à distance",
  },
  "Climatisation": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    description: "Climatisation pour un confort optimal en été",
  },
  "Télévision avec câble": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
      </svg>
    ),
    description: "Télévision avec accès aux chaînes câblées",
  },
  "Télévision intelligente": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
        <path d="M9 10.5l2 2 4-4" />
      </svg>
    ),
    description: "Télévision intelligente avec Netflix, Disney+ et plus",
  },
  "Système audio (musique)": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    description: "Système audio haute qualité pour une ambiance musicale",
  },
  "Cuisine complète avec vaisselle et chaudrons": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8v11a1 1 0 002 0V8M16 8v11a1 1 0 002 0V8" />
        <path d="M3 8h18" />
        <path d="M6 4c0-1 1-2 3-2h6c2 0 3 1 3 2v4H6V4z" />
      </svg>
    ),
    description: "Cuisine entièrement équipée pour cuisiner sur place",
  },
  "Literie et serviettes incluses": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v9H2V9z" />
        <path d="M2 13h20" />
        <path d="M5 7V5a2 2 0 012-2h10a2 2 0 012 2v2" />
        <path d="M2 20v2M22 20v2" />
      </svg>
    ),
    description: "Draps, oreillers et serviettes fournis par le propriétaire",
  },
  "Buanderie": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <circle cx="12" cy="13" r="4" />
        <path d="M5 6h2M10 6h.01" />
      </svg>
    ),
    description: "Laveuse et sécheuse disponibles sur place",
  },
  "Terrasse": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V10M19 21V10" />
        <path d="M12 3l7 7H5l7-7z" />
        <path d="M10 15h4v6h-4z" />
      </svg>
    ),
    description: "Terrasse extérieure pour profiter du plein air",
  },
  "Module de jeux pour enfant": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M9.5 7.5c0 1.5 1.5 2 2.5 2s2.5-.5 2.5-2" />
        <circle cx="10" cy="7" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="14" cy="7" r="0.5" fill="currentColor" stroke="none" />
        <path d="M5 21l7-9 7 9" />
      </svg>
    ),
    description: "Terrain de jeux extérieur pour les enfants",
  },
  "Borne de recharge pour véhicule électrique": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    description: "Borne de recharge pour voiture électrique disponible",
  },
};

const DEFAULT_CONFIG: AmenityConfig = {
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  description: "Disponible dans ce chalet",
};

function AmenityRow({ amenity }: { amenity: string }) {
  const config = AMENITY_CONFIG[amenity] ?? DEFAULT_CONFIG;
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="shrink-0 text-charcoal-800 mt-0.5">{config.icon}</div>
      <div>
        <p className="font-semibold text-charcoal-800 text-sm">{amenity}</p>
        <p className="text-sm text-charcoal-400 mt-0.5">{config.description}</p>
      </div>
    </div>
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
      <h2 className="font-semibold text-charcoal-800 mb-1">Points forts du chalet</h2>

      <div className="divide-y divide-[#ebebeb]">
        {(expanded ? sorted : top3).map((a) => (
          <AmenityRow key={a} amenity={a} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/5 transition-colors"
        >
          {expanded
            ? "Réduire ↑"
            : `Voir toutes les caractéristiques (${sorted.length}) →`}
        </button>
      )}
    </div>
  );
}
