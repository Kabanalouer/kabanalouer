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
  { id: "essentiels", label: "Essentiels", labelEn: "Essentials" },
  { id: "salle-de-bain", label: "Salle de bain", labelEn: "Bathroom" },
  { id: "chambre-et-linge", label: "Chambre et linge", labelEn: "Bedroom and laundry" },
  { id: "divertissement", label: "Divertissement", labelEn: "Entertainment" },
  { id: "famille", label: "Famille", labelEn: "Family" },
  { id: "chauffage-et-climatisation", label: "Chauffage et climatisation", labelEn: "Heating and cooling" },
  { id: "securite", label: "Sécurité", labelEn: "Safety" },
  { id: "internet-et-bureau", label: "Internet et bureau", labelEn: "Internet and office" },
  { id: "cuisine-et-repas", label: "Cuisine et repas", labelEn: "Kitchen and dining" },
  { id: "emplacement", label: "Emplacement", labelEn: "Location" },
  { id: "exterieur", label: "Extérieur", labelEn: "Outdoor" },
  { id: "stationnement", label: "Stationnement", labelEn: "Parking" },
  { id: "services", label: "Services", labelEn: "Services" },
];

export const AMENITY_CATALOG: AmenityCatalogEntry[] = [
  // Essentiels
  { id: "literie-serviettes", label: "Literie et serviettes incluses", labelEn: "Bedding and towels included", categoryId: "essentiels", icon: "BedDouble" },
  { id: "savon-shampoing", label: "Savon et shampoing", labelEn: "Soap and shampoo", categoryId: "essentiels", icon: "Droplet" },
  { id: "papier-hygienique", label: "Papier hygiénique", labelEn: "Toilet paper", categoryId: "essentiels", icon: "Package" },
  { id: "produits-nettoyage", label: "Produits de nettoyage", labelEn: "Cleaning products", categoryId: "essentiels", icon: "Sparkles" },

  // Salle de bain
  { id: "baignoire", label: "Baignoire", labelEn: "Bathtub", categoryId: "salle-de-bain", icon: "Bath" },
  { id: "seche-cheveux", label: "Sèche-cheveux", labelEn: "Hair dryer", categoryId: "salle-de-bain", icon: "Wind" },
  { id: "serviettes-piscine", label: "Serviettes de piscine", labelEn: "Pool towels", categoryId: "salle-de-bain", icon: "Waves" },
  { id: "salle-de-bain-privee", label: "Salle de bain privée", labelEn: "Private bathroom", categoryId: "salle-de-bain", icon: "DoorClosed" },

  // Chambre et linge
  { id: "cintres", label: "Cintres", labelEn: "Hangers", categoryId: "chambre-et-linge", icon: "Shirt" },
  { id: "fer-a-repasser", label: "Fer à repasser", labelEn: "Iron", categoryId: "chambre-et-linge", icon: "Sparkles" },
  { id: "buanderie", label: "Buanderie", labelEn: "Laundry", categoryId: "chambre-et-linge", icon: "WashingMachine" },
  { id: "draps-supplementaires", label: "Draps et oreillers supplémentaires", labelEn: "Extra sheets and pillows", categoryId: "chambre-et-linge", icon: "BedDouble" },
  { id: "rideaux-occultants", label: "Rideaux occultants", labelEn: "Blackout curtains", categoryId: "chambre-et-linge", icon: "Moon" },

  // Divertissement
  { id: "table-billard", label: "Table de billard", labelEn: "Pool table", categoryId: "divertissement", icon: "Disc" },
  { id: "babyfoot", label: "Babyfoot", labelEn: "Foosball", categoryId: "divertissement", icon: "Users" },
  { id: "table-ping-pong", label: "Table de ping-pong", labelEn: "Ping-pong table", categoryId: "divertissement", icon: "CircleDot" },
  { id: "arcades", label: "Arcades", labelEn: "Arcade games", categoryId: "divertissement", icon: "Gamepad2" },
  { id: "jeux-societe", label: "Jeux de société", labelEn: "Board games", categoryId: "divertissement", icon: "Dices" },
  { id: "livres-revues", label: "Livres et revues", labelEn: "Books & magazines", categoryId: "divertissement", icon: "BookOpen" },
  { id: "systeme-audio", label: "Système audio (musique)", labelEn: "Sound system", categoryId: "divertissement", icon: "Speaker" },
  { id: "tv-cable", label: "Télévision avec câble", labelEn: "Cable TV", categoryId: "divertissement", icon: "Tv" },
  { id: "tv-intelligente", label: "Télévision intelligente", labelEn: "Smart TV", categoryId: "divertissement", icon: "Tv2" },
  { id: "gym", label: "Gym", labelEn: "Gym", categoryId: "divertissement", icon: "Dumbbell" },

  // Famille
  { id: "module-jeux-enfant", label: "Module de jeux pour enfant", labelEn: "Children's play area", categoryId: "famille", icon: "Baby" },
  { id: "lit-bebe", label: "Lit de bébé (parc)", labelEn: "Crib", categoryId: "famille", icon: "Baby" },
  { id: "chaise-haute", label: "Chaise haute", labelEn: "High chair", categoryId: "famille", icon: "Baby" },
  { id: "jeux-exterieurs-enfants", label: "Balançoire et jeux extérieurs", labelEn: "Swing set and outdoor play", categoryId: "famille", icon: "Baby" },
  { id: "barrieres-securite", label: "Barrières de sécurité pour enfants", labelEn: "Child safety gates", categoryId: "famille", icon: "ShieldCheck" },
  { id: "jouets-enfants", label: "Jouets et livres pour enfants", labelEn: "Toys and books for children", categoryId: "famille", icon: "Blocks" },

  // Chauffage et climatisation
  { id: "climatisation", label: "Climatisation", labelEn: "Air conditioning", categoryId: "chauffage-et-climatisation", icon: "Snowflake" },
  { id: "chauffage-central", label: "Chauffage central", labelEn: "Central heating", categoryId: "chauffage-et-climatisation", icon: "Thermometer" },
  { id: "foyer-interieur-bois", label: "Foyer intérieur au bois", labelEn: "Indoor wood fireplace", categoryId: "chauffage-et-climatisation", icon: "Flame" },
  { id: "foyer-gaz", label: "Foyer au gaz", labelEn: "Gas fireplace", categoryId: "chauffage-et-climatisation", icon: "Flame" },
  { id: "thermopompe", label: "Thermopompe", labelEn: "Heat pump", categoryId: "chauffage-et-climatisation", icon: "Wind" },
  { id: "ventilateurs", label: "Ventilateurs", labelEn: "Fans", categoryId: "chauffage-et-climatisation", icon: "Fan" },

  // Sécurité
  { id: "detecteur-fumee", label: "Détecteur de fumée", labelEn: "Smoke detector", categoryId: "securite", icon: "Siren" },
  { id: "detecteur-co", label: "Détecteur de monoxyde de carbone", labelEn: "Carbon monoxide detector", categoryId: "securite", icon: "Siren" },
  { id: "extincteur", label: "Extincteur", labelEn: "Fire extinguisher", categoryId: "securite", icon: "FireExtinguisher" },
  { id: "trousse-premiers-soins", label: "Trousse de premiers soins", labelEn: "First aid kit", categoryId: "securite", icon: "Cross" },
  { id: "camera-exterieure", label: "Caméra de sécurité extérieure", labelEn: "Outdoor security camera", categoryId: "securite", icon: "Camera" },
  { id: "serrure-electronique", label: "Serrure électronique / boîte à clé", labelEn: "Electronic lock / lockbox", categoryId: "securite", icon: "KeyRound" },

  // Internet et bureau
  { id: "wifi", label: "Wifi", labelEn: "Wifi", categoryId: "internet-et-bureau", icon: "Wifi" },
  { id: "espace-travail", label: "Espace de travail dédié (télétravail)", labelEn: "Dedicated workspace (remote work)", categoryId: "internet-et-bureau", icon: "Laptop" },
  { id: "bureau-ergonomique", label: "Bureau avec chaise ergonomique", labelEn: "Desk with ergonomic chair", categoryId: "internet-et-bureau", icon: "Briefcase" },

  // Cuisine et repas
  { id: "cuisine-complete", label: "Cuisine complète avec vaisselle et chaudrons", labelEn: "Fully equipped kitchen", categoryId: "cuisine-et-repas", icon: "CookingPot" },
  { id: "refrigerateur", label: "Réfrigérateur", labelEn: "Refrigerator", categoryId: "cuisine-et-repas", icon: "Refrigerator" },
  { id: "four", label: "Four", labelEn: "Oven", categoryId: "cuisine-et-repas", icon: "Flame" },
  { id: "cuisiniere", label: "Cuisinière (plaque de cuisson)", labelEn: "Stove", categoryId: "cuisine-et-repas", icon: "Flame" },
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
        options: ["Filtre", "Nespresso", "Espresso manuelle", "Percolateur"],
        optionsEn: ["Drip", "Nespresso", "Manual espresso", "Percolator"],
      },
    ],
  },
  { id: "vaisselle-ustensiles", label: "Vaisselle et ustensiles de base", labelEn: "Basic dishes and utensils", categoryId: "cuisine-et-repas", icon: "UtensilsCrossed" },

  // Emplacement
  { id: "bord-eau", label: "Bord de l'eau", labelEn: "Waterfront", categoryId: "emplacement", icon: "Waves" },
  { id: "vue-panoramique", label: "Vue panoramique (lac ou montagne)", labelEn: "Panoramic view (lake or mountain)", categoryId: "emplacement", icon: "Mountain" },
  { id: "ski-in-ski-out", label: "Ski in / Ski out", labelEn: "Ski in / Ski out", categoryId: "emplacement", icon: "Mountain" },
  { id: "situe-resort", label: "Situé sur un resort", labelEn: "Resort location", categoryId: "emplacement", icon: "Building2" },
  { id: "sentiers-randonnee", label: "Sentiers de randonnée à proximité", labelEn: "Hiking trails nearby", categoryId: "emplacement", icon: "Footprints" },
  { id: "acces-motoneige-vtt", label: "Accès direct aux sentiers de motoneige/VTT", labelEn: "Direct access to snowmobile/ATV trails", categoryId: "emplacement", icon: "Route" },

  // Extérieur
  { id: "terrasse", label: "Terrasse", labelEn: "Terrace / deck", categoryId: "exterieur", icon: "Armchair" },
  { id: "foyer-exterieur", label: "Foyer extérieur (firepit)", labelEn: "Outdoor firepit", categoryId: "exterieur", icon: "Flame" },
  { id: "feu-de-camp", label: "Feu de camp autorisé", labelEn: "Campfire allowed", categoryId: "exterieur", icon: "Flame" },
  {
    id: "bbq",
    label: "BBQ",
    labelEn: "BBQ",
    categoryId: "exterieur",
    icon: "Flame",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "type", type: "single-select", label: "Type", labelEn: "Type", options: ["Gaz", "Charbon", "Bois"], optionsEn: ["Gas", "Charcoal", "Wood"] },
    ],
  },
  {
    id: "spa",
    label: "Spa extérieur",
    labelEn: "Outdoor spa",
    categoryId: "exterieur",
    icon: "Waves",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé"], optionsEn: ["Private", "Shared"] },
      { key: "capacite", type: "number", label: "Capacité (personnes)", labelEn: "Capacity (people)", placeholder: "Ex. 6", placeholderEn: "E.g. 6" },
      { key: "disponibleAnnee", type: "boolean", label: "Disponible toute l'année", labelEn: "Available year-round" },
    ],
  },
  { id: "sauna", label: "Sauna", labelEn: "Sauna", categoryId: "exterieur", icon: "Thermometer" },
  {
    id: "piscine",
    label: "Piscine",
    labelEn: "Pool",
    categoryId: "exterieur",
    icon: "Waves",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", labelEn: "Access", options: ["Privé", "Partagé", "Public"], optionsEn: ["Private", "Shared", "Public"] },
      { key: "chauffee", type: "boolean", label: "Chauffée", labelEn: "Heated" },
      { key: "emplacement", type: "single-select", label: "Emplacement", labelEn: "Location", options: ["Intérieure", "Extérieure"], optionsEn: ["Indoor", "Outdoor"] },
      { key: "horaires", type: "hours", label: "Horaires d'ouverture", labelEn: "Opening hours" },
    ],
  },
  { id: "quai", label: "Quai", labelEn: "Dock", categoryId: "exterieur", icon: "Anchor" },
  { id: "acces-lac-riviere", label: "Accès direct à un lac ou une rivière", labelEn: "Direct lake or river access", categoryId: "exterieur", icon: "Waves" },
  { id: "cabane-a-sucre", label: "Cabane à sucre sur le terrain", labelEn: "Sugar shack on the property", categoryId: "exterieur", icon: "TreePine" },
  { id: "patinoire", label: "Patinoire extérieure", labelEn: "Outdoor skating rink", categoryId: "exterieur", icon: "Snowflake" },
  { id: "chalet-bois-rond", label: "Chalet en bois rond", labelEn: "Log cabin", categoryId: "exterieur", icon: "TreePine" },

  // Stationnement
  {
    id: "stationnement",
    label: "Stationnement",
    labelEn: "Parking",
    categoryId: "stationnement",
    icon: "ParkingCircle",
    detailSchema: [
      { key: "places", type: "number", label: "Nombre de places", labelEn: "Number of spots", placeholder: "Ex. 4", placeholderEn: "E.g. 4" },
      { key: "gratuit", type: "boolean", label: "Gratuit", labelEn: "Free" },
    ],
  },
  { id: "stationnement-vr", label: "Espace pour VR ou remorque", labelEn: "RV or trailer parking", categoryId: "stationnement", icon: "Truck" },
  { id: "garage", label: "Garage", labelEn: "Garage", categoryId: "stationnement", icon: "Warehouse" },
  { id: "borne-recharge-vr", label: "Borne de recharge pour véhicule électrique", labelEn: "EV charging station", categoryId: "stationnement", icon: "Zap" },

  // Services
  { id: "menage-inclus", label: "Ménage inclus", labelEn: "Cleaning included", categoryId: "services", icon: "Sparkles" },
  { id: "arrivee-autonome", label: "Arrivée autonome (boîte à clé ou serrure électronique)", labelEn: "Self check-in (lockbox or smart lock)", categoryId: "services", icon: "KeyRound" },
  { id: "conciergerie", label: "Service de conciergerie", labelEn: "Concierge service", categoryId: "services", icon: "ConciergeBell" },
  { id: "panier-bienvenue", label: "Panier de bienvenue", labelEn: "Welcome basket", categoryId: "services", icon: "Gift" },
  { id: "location-equipement", label: "Location d'équipement sur place (kayak, vélo, motoneige)", labelEn: "On-site equipment rental (kayak, bike, snowmobile)", categoryId: "services", icon: "Bike" },
  { id: "navette", label: "Service de navette", labelEn: "Shuttle service", categoryId: "services", icon: "Car" },
];

// Ordre de priorité pour les "points forts" affichés sur la fiche publique
// (voir CLAUDE.md section 9, "Points forts du chalet") — distinct de l'ordre
// de AMENITY_CATALOG ci-dessus, qui sert au regroupement par catégorie dans
// l'éditeur, pas à ce classement. Position = priorité (plus haut = affiché en
// premier). Reprend l'ordre validé de l'ancien lib/amenities.ts pour les 30
// équipements déjà existants, les nouveaux (québécois ou non) insérés selon
// leur pouvoir différenciateur.
export const AMENITY_PRIORITY_ORDER: string[] = [
  // Argument de vente fort — bord de l'eau, détente, particularités québécoises
  "bord-eau", "quai", "acces-lac-riviere", "piscine", "spa", "sauna",
  "cabane-a-sucre", "patinoire", "ski-in-ski-out", "chalet-bois-rond",
  "foyer-interieur-bois", "foyer-exterieur", "feu-de-camp",
  // Divertissement, famille, emplacement
  "gym", "table-billard", "module-jeux-enfant", "borne-recharge-vr", "bbq",
  "babyfoot", "table-ping-pong", "arcades", "terrasse", "jeux-societe",
  "situe-resort", "livres-revues", "lit-bebe", "chaise-haute",
  "jeux-exterieurs-enfants", "barrieres-securite", "jouets-enfants",
  "vue-panoramique", "sentiers-randonnee", "acces-motoneige-vtt",
  "systeme-audio", "tv-intelligente", "tv-cable", "stationnement-vr",
  "garage", "stationnement",
  // Confort et pratique
  "wifi", "espace-travail", "bureau-ergonomique", "climatisation",
  "chauffage-central", "thermopompe", "ventilateurs", "foyer-gaz",
  "cuisine-complete", "refrigerateur", "four", "cuisiniere", "micro-ondes",
  "lave-vaisselle", "cafetiere", "vaisselle-ustensiles", "menage-inclus",
  "arrivee-autonome", "conciergerie", "panier-bienvenue",
  "location-equipement", "navette", "baignoire", "salle-de-bain-privee",
  "serviettes-piscine", "seche-cheveux",
  // Essentiels attendus par défaut — jamais un argument de vente
  "literie-serviettes", "buanderie", "cintres", "fer-a-repasser",
  "draps-supplementaires", "rideaux-occultants", "savon-shampoing",
  "papier-hygienique", "produits-nettoyage", "detecteur-fumee",
  "detecteur-co", "extincteur", "trousse-premiers-soins",
  "camera-exterieure", "serrure-electronique",
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
// vers son libellé d'affichage dans la langue demandée.
function translateOptionValue(field: AmenityDetailField, value: string, locale: string): string {
  if (locale !== "en" || !field.options || !field.optionsEn) return value;
  const idx = field.options.indexOf(value);
  return idx >= 0 ? (field.optionsEn[idx] ?? value) : value;
}

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

  for (const field of entry.detailSchema) {
    const value = details[field.key];
    if (value === undefined || value === null || value === "") continue;

    if (field.type === "boolean") {
      if (value === true) parts.push(isEn ? field.labelEn : field.label);
    } else if (field.type === "number") {
      parts.push(String(value));
    } else if (field.type === "hours" && typeof value === "object") {
      const hv = value as { open24?: boolean; start?: string; end?: string };
      if (hv.open24) parts.push(isEn ? "Open 24/7" : "Ouvert 24h/24");
      else if (hv.start && hv.end) parts.push(`${hv.start}–${hv.end}`);
    } else if (field.type === "single-select" && typeof value === "string") {
      parts.push(translateOptionValue(field, value, locale));
    } else if (field.type === "multi-select" && Array.isArray(value)) {
      const values = (value as unknown[]).filter((v): v is string => typeof v === "string");
      if (values.length > 0) parts.push(values.map((v) => translateOptionValue(field, v, locale)).join("/"));
    }
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}
