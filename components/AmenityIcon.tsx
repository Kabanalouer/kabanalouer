// Icônes SVG inline pour le catalogue d'équipements (lib/amenities-catalog.ts,
// champ `icon`) — jamais de librairie externe (voir CLAUDE.md, "Icônes : SVG
// inline avec strokeWidth={1.75}, jamais de librairie d'icônes externe").
// Le nom stocké dans le catalogue documente l'icône visée (convention
// lucide-react) ; ce fichier fournit le tracé maison correspondant.

const ICON_PATHS: Record<string, React.ReactNode> = {
  Waves: (
    <>
      <path d="M2 12c1.5-2.5 3-2.5 4.5 0s3 2.5 4.5 0 3-2.5 4.5 0 3 2.5 4.5 0" />
      <path d="M2 17c1.5-2.5 3-2.5 4.5 0s3 2.5 4.5 0 3-2.5 4.5 0 3 2.5 4.5 0" />
    </>
  ),
  Mountain: (
    <>
      <path d="M3 20L12 4l9 16H3z" />
      <path d="M12 4v6" />
    </>
  ),
  Building2: (
    <>
      <path d="M3 20L12 4l9 16H3z" />
      <path d="M9 20v-5a3 3 0 016 0v5" />
    </>
  ),
  Thermometer: (
    <>
      <path d="M8 3v2M12 2v3M16 3v2" />
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M7 13h10M7 17h6" />
    </>
  ),
  TreePine: (
    <>
      <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" />
      <path d="M9 21v-7h6v7" />
    </>
  ),
  Flame: (
    <>
      <path d="M12 2c0 4.5-5 6.5-5 11a5 5 0 0010 0c0-4.5-5-6.5-5-11z" />
      <path d="M12 12c0 2-2 3-2 4.5a2 2 0 004 0c0-1.5-2-2.5-2-4.5z" />
    </>
  ),
  Disc: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="7" cy="9" r="1.5" />
      <circle cx="17" cy="15" r="1.5" />
      <path d="M9.1 10.1l5.8 3.8" />
    </>
  ),
  Users: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M8 5v14M16 5v14" />
      <circle cx="8" cy="11" r="1.5" />
      <circle cx="16" cy="13" r="1.5" />
    </>
  ),
  CircleDot: (
    <>
      <rect x="2" y="9" width="20" height="11" rx="1" />
      <path d="M12 9v11M2 15h20" />
      <circle cx="17" cy="5" r="2.5" />
    </>
  ),
  Gamepad2: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="9" cy="15" r="1" />
      <circle cx="15" cy="15" r="1" />
      <circle cx="12" cy="18" r="1" />
    </>
  ),
  Dices: (
    <>
      <rect x="2" y="2" width="9" height="9" rx="1.5" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" />
      <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
      <path d="M17 16h4M19 14v4" />
    </>
  ),
  BookOpen: (
    <>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </>
  ),
  Dumbbell: (
    <>
      <path d="M6 4v16M18 4v16" />
      <path d="M2 8h4M18 8h4" />
      <path d="M2 16h4M18 16h4" />
      <path d="M6 12h12" />
    </>
  ),
  Wifi: (
    <>
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  Laptop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  Snowflake: (
    <>
      <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  Tv: (
    <>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 18v2" />
    </>
  ),
  Tv2: (
    <>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 18v2" />
      <path d="M9 10.5l2 2 4-4" />
    </>
  ),
  Speaker: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  CookingPot: (
    <>
      <path d="M6 8v11a1 1 0 002 0V8M16 8v11a1 1 0 002 0V8" />
      <path d="M3 8h18" />
      <path d="M6 4c0-1 1-2 3-2h6c2 0 3 1 3 2v4H6V4z" />
    </>
  ),
  BedDouble: (
    <>
      <path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v9H2V9z" />
      <path d="M2 13h20" />
      <path d="M5 7V5a2 2 0 012-2h10a2 2 0 012 2v2" />
      <path d="M2 20v2M22 20v2" />
    </>
  ),
  WashingMachine: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <circle cx="12" cy="13" r="4" />
      <path d="M5 6h2M10 6h.01" />
    </>
  ),
  Armchair: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V10M19 21V10" />
      <path d="M12 3l7 7H5l7-7z" />
      <path d="M10 15h4v6h-4z" />
    </>
  ),
  Baby: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M9.5 7.5c0 1.5 1.5 2 2.5 2s2.5-.5 2.5-2" />
      <circle cx="10" cy="7" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="0.5" fill="currentColor" stroke="none" />
      <path d="M5 21l7-9 7 9" />
    </>
  ),
  Zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  Droplet: <path d="M12 2C8 8 5 11.5 5 15a7 7 0 0014 0c0-3.5-3-7-7-13z" />,
  Package: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  Sparkles: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
  ),
  Bath: (
    <>
      <path d="M4 12h16v2a6 6 0 01-6 6H10a6 6 0 01-6-6v-2z" />
      <path d="M4 12V6a2 2 0 012-2h1" />
      <path d="M8 20v2M16 20v2" />
    </>
  ),
  Wind: (
    <>
      <path d="M3 8h11a3 3 0 100-3" />
      <path d="M3 12h15a3 3 0 110 3" />
      <path d="M3 16h8a2 2 0 110 4" />
    </>
  ),
  DoorClosed: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="1" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  Shirt: <path d="M8 4l4 2 4-2 4 3-3 3v10H7V10L4 7z" />,
  Moon: <path d="M20 14.5A8 8 0 1110 4a6.5 6.5 0 0010 10.5z" />,
  ShieldCheck: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  Blocks: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <path d="M17 13a4 4 0 100 8 4 4 0 000-8z" />
    </>
  ),
  Fan: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 12c0-4 2-7 5-7 2 0 3 2 1 4-2 2-4 3-6 3z" />
      <path d="M12 12c-4 0-7-2-7-5 0-2 2-3 4-1 2 2 3 4 3 6z" />
      <path d="M12 12c0 4-2 7-5 7-2 0-3-2-1-4 2-2 4-3 6-3z" />
    </>
  ),
  Siren: (
    <>
      <path d="M5 21v-6a7 7 0 0114 0v6H5z" />
      <path d="M12 4v3M5 21h14" />
    </>
  ),
  FireExtinguisher: (
    <>
      <path d="M9 3h4M10 3v3M8 6h6l1 4H7l1-4z" />
      <rect x="6" y="10" width="9" height="11" rx="1.5" />
      <path d="M17 8l3-2" />
    </>
  ),
  Cross: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 7v10M7 12h10" />
    </>
  ),
  Camera: (
    <>
      <rect x="2" y="7" width="14" height="11" rx="2" />
      <circle cx="9" cy="12.5" r="3" />
      <path d="M16 10l6-3v10l-6-3" />
    </>
  ),
  KeyRound: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l9 9M17 15l2 2M14 18l2 2" />
    </>
  ),
  Briefcase: (
    <>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M2 12h20" />
    </>
  ),
  Refrigerator: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 9h12M9 5v2M9 12v3" />
    </>
  ),
  Microwave: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <rect x="4" y="8" width="11" height="8" rx="1" />
      <circle cx="18" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M18 13h1" />
    </>
  ),
  Coffee: (
    <>
      <path d="M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8z" />
      <path d="M17 9h2a2 2 0 010 4h-2" />
      <path d="M6 3c0 1 1 1 1 2s-1 1-1 2M10 3c0 1 1 1 1 2s-1 1-1 2" />
    </>
  ),
  UtensilsCrossed: (
    <>
      <path d="M4 3v6a2 2 0 002 2v10M4 3v6M6 3v6" />
      <path d="M20 3l-6 6M14 3l6 6M17 9l-9 9" />
    </>
  ),
  Footprints: (
    <>
      <path d="M8 3a2 2 0 012 2v2a2 2 0 01-4 0V5a2 2 0 012-2z" />
      <path d="M16 9a2 2 0 012 2v2a2 2 0 01-4 0v-2a2 2 0 012-2z" />
      <path d="M6 13v3a2 2 0 002 2M18 19v-3a2 2 0 00-2-2" />
    </>
  ),
  Route: (
    <>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h5a4 4 0 004-4V9a4 4 0 014-4" strokeDasharray="2 2" />
    </>
  ),
  Anchor: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v14" />
      <path d="M6 14a6 6 0 0012 0" />
      <path d="M4 10h4M16 10h4" />
    </>
  ),
  ParkingCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 16V8h3a2.5 2.5 0 010 5h-3" />
    </>
  ),
  Truck: (
    <>
      <rect x="1" y="7" width="13" height="9" rx="1" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  Warehouse: (
    <>
      <path d="M3 21V10l9-5 9 5v11" />
      <path d="M7 21v-7h10v7" />
    </>
  ),
  ConciergeBell: (
    <>
      <path d="M4 18h16" />
      <path d="M6 18a6 6 0 0112 0" />
      <circle cx="12" cy="6" r="1.5" />
      <path d="M12 7.5V10" />
    </>
  ),
  Gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M3 9h18v4H3z" />
      <path d="M12 9v12" />
      <path d="M12 9c-2-4-7-4-7-1s3 1 7 1zM12 9c2-4 7-4 7-1s-3 1-7 1z" />
    </>
  ),
  Bike: (
    <>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17l4-8h5l3 8M10 9h3" />
    </>
  ),
  Car: (
    <>
      <path d="M3 16V11l2-5h10l3 5h1a2 2 0 012 2v3" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="17.5" cy="16.5" r="1.5" />
      <path d="M3 16h3m8 0h5" />
    </>
  ),
};

const DEFAULT_PATH = <path d="M5 13l4 4L19 7" />;

export default function AmenityIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name] ?? DEFAULT_PATH}
    </svg>
  );
}
