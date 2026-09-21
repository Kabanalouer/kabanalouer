// Catalogue d'équipements (catégories + détails par équipement, façon
// Airbnb) — remplace lib/amenities.ts (liste plate de 30 chaînes, supprimé).
// Format cible de listings.amenities (jsonb) : voir AmenityValue.

export type AmenityDetailFieldType = "single-select" | "multi-select" | "number" | "boolean" | "hours";

export interface AmenityDetailField {
  key: string;
  type: AmenityDetailFieldType;
  label: string;
  labelEn: string;
  // Valeurs canoniques (FR) — stockées telles quelles dans details[key].
  options?: string[];
  // Traductions EN, alignées positionnellement avec options (jamais stockées,
  // affichage seulement — voir getAmenityDetailOptionLabel).
  optionsEn?: string[];
  placeholder?: string;
  placeholderEn?: string;
  // Champs "number" seulement — borne le compteur +/- pour qu'une valeur
  // saisie sans limite ne puisse jamais produire un résumé trop long.
  max?: number;
  // Champs "number" seulement — unité affichée après la valeur (ex. "pers.")
  // dans le résumé et le panneau de détails, jamais stockée dans details[key].
  unit?: string;
  // N'affiche (et ne sauvegarde) ce champ que si details[showIf.key] vaut
  // exactement showIf.equals — ex. "Bois inclus" seulement si Type = "Bois".
  showIf?: { key: string; equals: string | boolean };
  // Libellés utilisés uniquement dans le résumé (dashboard + fiche publique +
  // JSON-LD), alignés positionnellement avec `options` — ex. la valeur
  // stockée reste "Bois" mais le résumé affiche "Au bois". Si absent pour une
  // valeur donnée, le résumé retombe sur `options` (FR) / `optionsEn` (EN)
  // tel quel — n'affecte aucun champ qui ne les définit pas.
  summaryLabels?: string[];
  summaryLabelsEn?: string[];
  // Équivalent de summaryLabels/summaryLabelsEn pour un champ "boolean" (une
  // seule valeur affichée, à true) — ex. "Disponible toute l'année" devient
  // "À l'année" dans le résumé. Si absent, retombe sur label/labelEn.
  summaryLabel?: string;
  summaryLabelEn?: string;
  // N'affiche jamais ce champ dans le résumé (dashboard + fiche publique +
  // JSON-LD), même rempli — reste éditable dans le panneau de détails, juste
  // jamais mentionné dans le texte généré. Ex. l'emplacement du Spa
  // (Intérieur/Extérieur), jugé redondant à afficher.
  excludeFromSummary?: boolean;
}

export interface AmenityCategory {
  id: string;
  label: string;
  labelEn: string;
}

export interface AmenityCatalogEntry {
  id: string;
  label: string;
  labelEn: string;
  categoryId: string;
  icon: string;
  detailSchema?: AmenityDetailField[];
}

// Format cible d'un élément de listings.amenities (jsonb) — remplace l'ancien
// tableau de chaînes (string[]).
export interface AmenityValue {
  id: string;
  details?: Record<string, unknown>;
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  { id: "cuisine-et-repas", label: "Cuisine et repas", labelEn: "Kitchen and dining" },
  { id: "emplacement", label: "Emplacement", labelEn: "Location" },
  { id: "divertissement", label: "Divertissement", labelEn: "Entertainment" },
  { id: "exterieur", label: "Extérieur", labelEn: "Outdoor" },
  { id: "essentiels", label: "Essentiels", labelEn: "Essentials" },
  { id: "chauffage-et-climatisation", label: "Chauffage et climatisation", labelEn: "Heating and cooling" },
  { id: "stationnement", label: "Stationnement", labelEn: "Parking" },
  { id: "securite", label: "Sécurité", labelEn: "Safety" },
  { id: "services", label: "Services", labelEn: "Services" },
];

export const AMENITY_CATALOG: AmenityCatalogEntry[] = [
  // Cuisine et repas
  { id: "cuisine-complete", label: "Cuisine complète avec vaisselle et chaudrons", labelEn: "Fully equipped kitchen", categoryId: "cuisine-et-repas", icon: "CookingPot" },
  { id: "refrigerateur", label: "Réfrigérateur", labelEn: "Refrigerator", categoryId: "cuisine-et-repas", icon: "Refrigerator" },
  { id: "four", label: "Four", labelEn: "Oven", categoryId: "cuisine-et-repas", icon: "Flame" },
  { id: "cuisiniere", label: "Cuisinière", labelEn: "Stove", categoryId: "cuisine-et-repas", icon: "Flame" },
  { id: "micro-ondes", label: "Four à micro-ondes", labelEn: "Microwave", categoryId: "cuisine-et-repas", icon: "Microwave" },
  { id: "lave-vaisselle", label: "Lave-vaisselle", labelEn: "Dishwasher", categoryId: "cuisine-et-repas", icon: "Sparkles" },
  {
    id: "cafetiere",
    label: "Cafetière",
    labelEn: "Coffee maker",
    categoryId: "cuisine-et-repas",
    icon: "Coffee",
    detailSchema: [
      {
        key: "type", type: "multi-select", label: "Type", labelEn: "Type",
        options: ["Filtre", "Nespresso Original", "Nespresso Vertuo", "Keurig", "Espresso manuelle", "Percolateur"],
        optionsEn: ["Drip", "Nespresso Original", "Nespresso Vertuo", "Keurig", "Manual espresso", "Percolator"],
      },
    ],
  },

  // Emplacement
  { id: "bord-eau", label: "Bord de l'eau", labelEn: "Waterfront", categoryId: "emplacement", icon: "Waves" },
  { id: "ski-in-ski-out", label: "Ski in / Ski out", labelEn: "Ski in / Ski out", categoryId: "emplacement", icon: "Mountain" },
  {
    id: "situe-resort",
    label: "Situé sur un resort",
    labelEn: "Resort location",
    categoryId: "emplacement",
    icon: "Building2",
    detailSchema: [
      { key: "accesInclus", type: "boolean", label: "Accès inclus", labelEn: "Access included" },
    ],
  },
  { id: "sentiers-randonnee", label: "Sentier de randonnée sur le site", labelEn: "On-site hiking trail", categoryId: "emplacement", icon: "Footprints" },
  { id: "acces-motoneige-vtt", label: "Accès direct aux sentiers de motoneige/VTT", labelEn: "Direct access to snowmobile/ATV trails", categoryId: "emplacement", icon: "Route" },

  // Divertissement
  {
    id: "table-billard",
    label: "Table de billard",
    labelEn: "Pool table",
    categoryId: "divertissement",
    icon: "Disc",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "babyfoot",
    label: "Babyfoot",
    labelEn: "Foosball",
    categoryId: "divertissement",
    icon: "Users",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "table-ping-pong",
    label: "Table de ping-pong",
    labelEn: "Ping-pong table",
    categoryId: "divertissement",
    icon: "CircleDot",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "arcades",
    label: "Arcades",
    labelEn: "Arcade games",
    categoryId: "divertissement",
    icon: "Gamepad2",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  { id: "jeux-societe", label: "Jeux de société", labelEn: "Board games", categoryId: "divertissement", icon: "Dices" },
  { id: "livres-revues", label: "Livres et revues", labelEn: "Books & magazines", categoryId: "divertissement", icon: "BookOpen" },
  { id: "systeme-audio", label: "Système audio (musique)", labelEn: "Sound system", categoryId: "divertissement", icon: "Speaker" },
  {
    id: "tv-intelligente",
    label: "Télévision",
    labelEn: "Television",
    categoryId: "divertissement",
    icon: "Tv2",
    detailSchema: [
      {
        key: "type", type: "single-select", label: "Type", labelEn: "Type",
        options: ["Par câble", "Intelligente (Netflix, etc.)", "Satellite"],
        optionsEn: ["Cable", "Smart (Netflix, etc.)", "Satellite"],
      },
    ],
  },
  {
    id: "gym",
    label: "Gym",
    labelEn: "Gym",
    categoryId: "divertissement",
    icon: "Dumbbell",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "horaires", type: "hours", label: "Horaires d'ouverture", labelEn: "Opening hours" },
    ],
  },
  {
    id: "piscine-interieure",
    label: "Piscine intérieure",
    labelEn: "Indoor pool",
    categoryId: "divertissement",
    icon: "IndoorPool",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "chauffee", type: "boolean", label: "Chauffée", labelEn: "Heated" },
      { key: "horaires", type: "hours", label: "Horaires d'ouverture", labelEn: "Opening hours" },
    ],
  },
  { id: "wifi", label: "Wifi", labelEn: "Wifi", categoryId: "divertissement", icon: "Wifi" },
  {
    id: "espace-travail",
    label: "Espace de travail (télétravail)",
    labelEn: "Workspace (remote work)",
    categoryId: "divertissement",
    icon: "Laptop",
    detailSchema: [
      {
        key: "acces", type: "single-select", label: "Accès", labelEn: "Access",
        options: ["Privé", "Commun", "Privé et Commun"],
        optionsEn: ["Private", "Shared", "Private and shared"],
      },
    ],
  },

  // Extérieur
  { id: "terrasse", label: "Terrasse", labelEn: "Terrace / deck", categoryId: "exterieur", icon: "Armchair" },
  {
    id: "foyer-exterieur",
    label: "Foyer extérieur (firepit)",
    labelEn: "Outdoor firepit",
    categoryId: "exterieur",
    icon: "Flame",
    detailSchema: [
      {
        key: "boisInclus", type: "single-select", label: "Bois inclus", labelEn: "Wood included",
        options: ["Oui", "Non"], optionsEn: ["Yes", "No"],
        summaryLabels: ["Bois inclus", "Bois non inclus"], summaryLabelsEn: ["Wood included", "Wood not included"],
      },
    ],
  },
  {
    id: "bbq",
    label: "BBQ",
    labelEn: "BBQ",
    categoryId: "exterieur",
    icon: "Flame",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "type", type: "single-select", label: "Type", labelEn: "Type", options: ["Gaz", "Charbon", "Bois"], optionsEn: ["Gas", "Charcoal", "Wood"] },
      {
        key: "disponibilite", type: "single-select", label: "Accessible à l'année", labelEn: "Available",
        options: ["À l'année", "En saison"], optionsEn: ["Year-round", "Seasonal"],
      },
    ],
  },
  {
    id: "spa",
    label: "Spa",
    labelEn: "Spa",
    categoryId: "exterieur",
    icon: "SpaSteam",
    detailSchema: [
      { key: "emplacement", type: "single-select", label: "Emplacement", labelEn: "Location", options: ["Intérieur", "Extérieur"], optionsEn: ["Indoor", "Outdoor"], excludeFromSummary: true },
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "capacite", type: "number", label: "Capacité (personnes)", labelEn: "Capacity (people)", placeholder: "Ex. 6", placeholderEn: "E.g. 6", max: 20, unit: "pers." },
      {
        key: "disponibleAnnee", type: "boolean", label: "Disponible toute l'année", labelEn: "Available year-round",
        summaryLabel: "À l'année", summaryLabelEn: "Year-round",
      },
    ],
  },
  {
    id: "sauna",
    label: "Sauna",
    labelEn: "Sauna",
    categoryId: "exterieur",
    icon: "Thermometer",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "piscine-exterieure",
    label: "Piscine extérieure",
    labelEn: "Outdoor pool",
    categoryId: "exterieur",
    icon: "OutdoorPool",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "chauffee", type: "boolean", label: "Chauffée", labelEn: "Heated" },
      { key: "horaires", type: "hours", label: "Horaires d'ouverture", labelEn: "Opening hours" },
    ],
  },
  {
    id: "quai",
    label: "Quai",
    labelEn: "Dock",
    categoryId: "exterieur",
    icon: "Anchor",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "acces-lac",
    label: "Accès à un lac",
    labelEn: "Lake access",
    categoryId: "exterieur",
    icon: "SailBoat",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Public"], optionsEn: ["Private", "Public"] },
      { key: "plage", type: "boolean", label: "Plage", labelEn: "Beach" },
      { key: "locationEmbarcations", type: "boolean", label: "Location d'embarcations", labelEn: "Boat rental" },
      {
        key: "gratuitPayant", type: "single-select", label: "Gratuit ou payant", labelEn: "Free or paid",
        options: ["Gratuit", "Payant"], optionsEn: ["Free", "Paid"],
        showIf: { key: "locationEmbarcations", equals: true },
      },
    ],
  },
  {
    id: "patinoire",
    label: "Patinoire extérieure",
    labelEn: "Outdoor skating rink",
    categoryId: "exterieur",
    icon: "Snowflake",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  {
    id: "terrain-tennis",
    label: "Terrain de tennis",
    labelEn: "Tennis court",
    categoryId: "exterieur",
    icon: "TennisBall",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      {
        key: "locationRaquette", type: "single-select", label: "Location de raquette", labelEn: "Racket rental",
        options: ["Oui", "Non"], optionsEn: ["Yes", "No"],
      },
      {
        key: "gratuitPayant", type: "single-select", label: "Gratuite ou payante", labelEn: "Free or paid",
        options: ["Gratuite", "Payante"], optionsEn: ["Free", "Paid"],
        showIf: { key: "locationRaquette", equals: "Oui" },
      },
    ],
  },
  {
    id: "terrain-pickleball",
    label: "Terrain de pickleball",
    labelEn: "Pickleball court",
    categoryId: "exterieur",
    icon: "PickleballPaddle",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      {
        key: "locationRaquette", type: "single-select", label: "Location de raquette", labelEn: "Racket rental",
        options: ["Oui", "Non"], optionsEn: ["Yes", "No"],
      },
      {
        key: "gratuitPayant", type: "single-select", label: "Gratuite ou payante", labelEn: "Free or paid",
        options: ["Gratuite", "Payante"], optionsEn: ["Free", "Paid"],
        showIf: { key: "locationRaquette", equals: "Oui" },
      },
    ],
  },
  { id: "chalet-bois-rond", label: "Chalet en bois rond", labelEn: "Log cabin", categoryId: "exterieur", icon: "TreePine" },
  {
    id: "module-jeux-enfant",
    label: "Module de jeux pour enfant",
    labelEn: "Children's play area",
    categoryId: "exterieur",
    icon: "Baby",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },

  // Essentiels
  { id: "literie-serviettes", label: "Literie et serviettes incluses", labelEn: "Bedding and towels included", categoryId: "essentiels", icon: "BedDouble" },
  { id: "savon-shampoing", label: "Savon et shampoing", labelEn: "Soap and shampoo", categoryId: "essentiels", icon: "Droplet" },
  { id: "papier-hygienique", label: "Papier hygiénique", labelEn: "Toilet paper", categoryId: "essentiels", icon: "Package" },
  { id: "produits-nettoyage", label: "Produits de nettoyage", labelEn: "Cleaning products", categoryId: "essentiels", icon: "Sparkles" },
  { id: "baignoire", label: "Baignoire", labelEn: "Bathtub", categoryId: "essentiels", icon: "Bath" },
  { id: "seche-cheveux", label: "Sèche-cheveux", labelEn: "Hair dryer", categoryId: "essentiels", icon: "Wind" },
  { id: "serviettes-piscine", label: "Serviettes de piscine", labelEn: "Pool towels", categoryId: "essentiels", icon: "Waves" },
  { id: "cintres", label: "Cintres", labelEn: "Hangers", categoryId: "essentiels", icon: "Shirt" },
  { id: "fer-a-repasser", label: "Fer à repasser", labelEn: "Iron", categoryId: "essentiels", icon: "Sparkles" },
  {
    id: "buanderie",
    label: "Buanderie",
    labelEn: "Laundry",
    categoryId: "essentiels",
    icon: "WashingMachine",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
    ],
  },
  { id: "draps-supplementaires", label: "Draps et oreillers supplémentaires", labelEn: "Extra sheets and pillows", categoryId: "essentiels", icon: "BedDouble" },
  { id: "rideaux-occultants", label: "Rideaux occultants", labelEn: "Blackout curtains", categoryId: "essentiels", icon: "Moon" },
  { id: "lit-bebe", label: "Lit de bébé (parc)", labelEn: "Crib", categoryId: "essentiels", icon: "Baby" },
  { id: "chaise-haute", label: "Chaise haute", labelEn: "High chair", categoryId: "essentiels", icon: "Baby" },
  { id: "barrieres-securite", label: "Barrières de sécurité pour enfants", labelEn: "Child safety gates", categoryId: "essentiels", icon: "ShieldCheck" },
  { id: "jouets-enfants", label: "Jouets et livres pour enfants", labelEn: "Toys and books for children", categoryId: "essentiels", icon: "Blocks" },

  // Chauffage et climatisation
  { id: "climatisation", label: "Climatisation", labelEn: "Air conditioning", categoryId: "chauffage-et-climatisation", icon: "Snowflake" },
  { id: "chauffage-central", label: "Chauffage central", labelEn: "Central heating", categoryId: "chauffage-et-climatisation", icon: "Thermometer" },
  {
    id: "foyer-interieur-bois",
    label: "Foyer intérieur",
    labelEn: "Indoor fireplace",
    categoryId: "chauffage-et-climatisation",
    icon: "Flame",
    detailSchema: [
      {
        key: "type", type: "single-select", label: "Type", labelEn: "Type",
        options: ["Bois", "Gaz"], optionsEn: ["Wood", "Gas"],
        summaryLabels: ["Au bois", "Gaz"],
      },
      {
        key: "boisInclus", type: "single-select", label: "Bois inclus", labelEn: "Wood included",
        options: ["Oui", "Non"], optionsEn: ["Yes", "No"],
        summaryLabels: ["Bois inclus", "Bois non inclus"], summaryLabelsEn: ["Wood included", "Wood not included"],
        showIf: { key: "type", equals: "Bois" },
      },
    ],
  },
  { id: "thermopompe", label: "Thermopompe", labelEn: "Heat pump", categoryId: "chauffage-et-climatisation", icon: "Wind" },
  { id: "ventilateurs", label: "Ventilateurs", labelEn: "Fans", categoryId: "chauffage-et-climatisation", icon: "Fan" },

  // Stationnement
  {
    id: "stationnement",
    label: "Stationnement",
    labelEn: "Parking",
    categoryId: "stationnement",
    icon: "ParkingCircle",
    detailSchema: [
      { key: "places", type: "number", label: "Nombre de places", labelEn: "Number of spots", placeholder: "Ex. 4", placeholderEn: "E.g. 4", max: 30 },
      { key: "gratuit", type: "boolean", label: "Gratuit", labelEn: "Free" },
    ],
  },
  { id: "garage", label: "Garage", labelEn: "Garage", categoryId: "stationnement", icon: "Warehouse" },
  { id: "borne-recharge-vr", label: "Borne de recharge pour véhicule électrique", labelEn: "EV charging station", categoryId: "stationnement", icon: "Zap" },

  // Sécurité
  { id: "detecteur-fumee", label: "Détecteur de fumée", labelEn: "Smoke detector", categoryId: "securite", icon: "Siren" },
  { id: "detecteur-co", label: "Détecteur de monoxyde de carbone", labelEn: "Carbon monoxide detector", categoryId: "securite", icon: "Siren" },
  { id: "extincteur", label: "Extincteur", labelEn: "Fire extinguisher", categoryId: "securite", icon: "FireExtinguisher" },
  { id: "trousse-premiers-soins", label: "Trousse de premiers soins", labelEn: "First aid kit", categoryId: "securite", icon: "Cross" },
  { id: "camera-exterieure", label: "Caméra de sécurité extérieure", labelEn: "Outdoor security camera", categoryId: "securite", icon: "Camera" },
  {
    id: "serrure-electronique",
    label: "Arrivée autonome",
    labelEn: "Self check-in",
    categoryId: "securite",
    icon: "KeyRound",
    detailSchema: [
      {
        key: "type", type: "single-select", label: "Type", labelEn: "Type",
        options: ["Serrure électronique", "Boîte à clé"],
        optionsEn: ["Electronic lock", "Lockbox"],
      },
    ],
  },

  // Services
  { id: "menage-inclus", label: "Ménage inclus", labelEn: "Cleaning included", categoryId: "services", icon: "Sparkles" },
  { id: "conciergerie", label: "Service de conciergerie", labelEn: "Concierge service", categoryId: "services", icon: "ConciergeBell" },
  { id: "panier-bienvenue", label: "Panier de bienvenue", labelEn: "Welcome basket", categoryId: "services", icon: "Gift" },
];

// Ordre de priorité pour les "points forts" affichés sur la fiche publique
// (voir CLAUDE.md section 9, "Points forts du chalet") — distinct de l'ordre
// de AMENITY_CATALOG ci-dessus, qui sert au regroupement par catégorie dans
// l'éditeur, pas à ce classement. Position = priorité (plus haut = affiché en
// premier). Reprend l'ordre validé de l'ancien lib/amenities.ts pour les 30
// équipements déjà existants, les nouveaux (québécois ou non) insérés selon
// leur pouvoir différenciateur.
export const AMENITY_PRIORITY_ORDER: string[] = [
  "bord-eau", "piscine-interieure", "ski-in-ski-out", "spa", "sauna", "piscine-exterieure",
  "acces-lac", "table-billard", "terrain-tennis", "terrain-pickleball", "gym",
  "chalet-bois-rond", "babyfoot", "table-ping-pong", "arcades", "foyer-interieur-bois",
  "foyer-exterieur", "module-jeux-enfant", "situe-resort", "bbq", "terrasse",
  "borne-recharge-vr", "sentiers-randonnee", "acces-motoneige-vtt", "patinoire",
  "espace-travail", "climatisation", "serrure-electronique", "quai", "jeux-societe",
  "systeme-audio", "tv-intelligente", "garage", "stationnement", "wifi", "menage-inclus",
  "buanderie", "jouets-enfants", "conciergerie", "panier-bienvenue", "literie-serviettes",
  "livres-revues", "lit-bebe", "chaise-haute", "barrieres-securite", "chauffage-central",
  "thermopompe", "ventilateurs", "cuisine-complete", "refrigerateur", "four", "cuisiniere",
  "micro-ondes", "lave-vaisselle", "cafetiere", "baignoire", "serviettes-piscine",
  "seche-cheveux", "cintres", "fer-a-repasser", "draps-supplementaires",
  "rideaux-occultants", "savon-shampoing", "papier-hygienique", "produits-nettoyage",
  "detecteur-fumee", "detecteur-co", "extincteur", "trousse-premiers-soins",
  "camera-exterieure",
];

export function getAmenityCatalogEntry(id: string): AmenityCatalogEntry | undefined {
  return AMENITY_CATALOG.find((e) => e.id === id);
}

export function getAmenityLabel(id: string, locale: string): string {
  const entry = getAmenityCatalogEntry(id);
  if (!entry) return id;
  return locale === "en" ? entry.labelEn : entry.label;
}

export function getAmenityLabels(amenities: AmenityValue[], locale: string): string[] {
  return amenities.map((a) => getAmenityLabel(a.id, locale));
}

export function getAmenityCategoryLabel(categoryId: string, locale: string): string {
  const category = AMENITY_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return categoryId;
  return locale === "en" ? category.labelEn : category.label;
}

// Traduit une valeur stockée (canonique, FR) d'un champ single/multi-select
// vers son libellé d'affichage dans la langue demandée — `summaryLabels`/
// `summaryLabelsEn`, si définis pour cette valeur, priment sur `options`/
// `optionsEn` (ex. valeur stockée "Bois", résumé "Au bois").
function translateOptionValue(field: AmenityDetailField, value: string, locale: string): string {
  const idx = field.options?.indexOf(value) ?? -1;
  if (locale === "en") {
    if (idx < 0 || !field.optionsEn) return value;
    return field.summaryLabelsEn?.[idx] ?? field.optionsEn[idx] ?? value;
  }
  if (idx >= 0 && field.summaryLabels) return field.summaryLabels[idx] ?? value;
  return value;
}

// "Location d'embarcation(s)"/"Location de raquette" pliées avec leur champ
// Gratuit/Payant lié en une seule phrase du résumé (ex. "Location
// d'embarcation gratuite") plutôt que deux parties séparées — Accès à un
// lac, Terrain de tennis, Terrain de pickleball.
const RENTAL_SUMMARY_COMBOS: Record<
  string,
  { triggerKey: string; priceKey: string; base: string; baseEn: string }
> = {
  "acces-lac": { triggerKey: "locationEmbarcations", priceKey: "gratuitPayant", base: "Location d'embarcation", baseEn: "Boat rental" },
  "terrain-tennis": { triggerKey: "locationRaquette", priceKey: "gratuitPayant", base: "Location de raquette", baseEn: "Racket rental" },
  "terrain-pickleball": { triggerKey: "locationRaquette", priceKey: "gratuitPayant", base: "Location de raquette", baseEn: "Racket rental" },
};

// Résumé auto-généré des détails choisis pour un équipement (ex. "Privé •
// Gaz"), affiché sous son nom dans la colonne "Équipements ajoutés" de
// l'éditeur. Retourne null si aucun détail n'est rempli — pas de ligne de
// résumé dans ce cas.
export function summarizeAmenityDetails(
  entry: AmenityCatalogEntry,
  details: Record<string, unknown> | undefined,
  locale: string
): string | null {
  if (!entry.detailSchema || !details) return null;
  const isEn = locale === "en";
  const parts: string[] = [];
  const combo = RENTAL_SUMMARY_COMBOS[entry.id];

  for (const field of entry.detailSchema) {
    // Champ jamais affiché dans le résumé (ex. l'emplacement du Spa) — reste
    // éditable dans le panneau de détails, juste jamais mentionné ici.
    if (field.excludeFromSummary) continue;

    // Le champ Gratuit/Payant d'une combo est plié dans son champ déclencheur
    // ci-dessous — jamais affiché comme une partie séparée du résumé.
    if (combo && field.key === combo.priceKey) continue;

    // Un champ conditionnel (ex. "Bois inclus" seulement si Type = "Bois")
    // ne doit jamais apparaître dans le résumé si sa condition ne tient plus
    // — même si une ancienne valeur traîne encore dans `details`.
    if (field.showIf && details[field.showIf.key] !== field.showIf.equals) continue;

    if (combo && field.key === combo.triggerKey) {
      const active = field.type === "boolean" ? details[field.key] === true : details[field.key] === "Oui";
      if (!active) continue;
      const base = isEn ? combo.baseEn : combo.base;
      const price = details[combo.priceKey];
      if (price === "Gratuit" || price === "Gratuite") parts.push(isEn ? `Free ${base.toLowerCase()}` : `${base} gratuite`);
      else if (price === "Payant" || price === "Payante") parts.push(isEn ? `Paid ${base.toLowerCase()}` : `${base} payante`);
      else parts.push(base);
      continue;
    }

    const value = details[field.key];
    if (value === undefined || value === null || value === "") continue;

    if (field.type === "boolean") {
      if (value === true) parts.push(isEn ? (field.summaryLabelEn ?? field.labelEn) : (field.summaryLabel ?? field.label));
    } else if (field.type === "number") {
      parts.push(field.unit ? `${value} ${field.unit}` : String(value));
    } else if (field.type === "hours" && typeof value === "object") {
      const hv = value as { open24?: boolean; start?: string; end?: string };
      if (hv.open24) parts.push(isEn ? "Open 24/7" : "Ouvert 24h/24");
      else if (hv.start && hv.end) parts.push(`${hv.start}–${hv.end}`);
    } else if (field.type === "single-select" && typeof value === "string") {
      parts.push(translateOptionValue(field, value, locale));
    } else if (field.type === "multi-select" && Array.isArray(value)) {
      let values = (value as unknown[]).filter((v): v is string => typeof v === "string");
      // Une ancienne valeur générique orpheline (ex. "Nespresso", remplacée
      // depuis par "Nespresso Original"/"Nespresso Vertuo" dans le catalogue
      // mais jamais retirée des données déjà enregistrées) ne doit jamais
      // s'afficher en plus de son sous-type précis déjà sélectionné — sinon
      // le résumé répète le même mot deux fois ("Nespresso, Nespresso
      // Original"). Filtrée dès qu'une autre valeur sélectionnée la précise.
      values = values.filter((v) => !values.some((other) => other !== v && other.startsWith(`${v} `)));
      if (values.length === 0) continue;
      // Énumération complète, en toutes lettres — un seul type (ex.
      // cafetière filtre seule) s'affiche donc directement sans séparateur.
      parts.push(values.map((v) => translateOptionValue(field, v, locale)).join(", "));
    }
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

// Groupe les équipements d'une annonce par catégorie, dans l'ordre de
// AMENITY_CATEGORIES — utilisé par le modal "Ce que propose ce chalet"
// (fiche publique). Une catégorie sans équipement sur cette fiche est omise.
// Un id inconnu du catalogue est ignoré (jamais affiché sans libellé).
export function groupAmenitiesByCategory(
  amenities: AmenityValue[]
): { category: AmenityCategory; items: AmenityValue[] }[] {
  return AMENITY_CATEGORIES.map((category) => ({
    category,
    items: amenities.filter((a) => getAmenityCatalogEntry(a.id)?.categoryId === category.id),
  })).filter((group) => group.items.length > 0);
}
