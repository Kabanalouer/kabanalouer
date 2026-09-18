// Nouveau catalogue d'équipements (catégories + détails par équipement, façon
// Airbnb) — remplace progressivement lib/amenities.ts (liste plate de 30
// chaînes). Étape 1 seulement : ce fichier définit le catalogue et le format
// cible de listings.amenities (voir AmenityValue). L'UI existante
// (AmenitiesPicker, EditListingForm, AmenitiesSection, filtres publics,
// lib/listingScore.ts) continue de lire/écrire l'ancien format tant que
// l'étape 2 (nouvelle UI) n'est pas livrée — ne pas migrer les données en
// production avant que cette UI soit prête à lire le nouveau format
// (voir supabase/migrate-amenities-to-catalog.sql).

export type AmenityDetailFieldType = "single-select" | "multi-select" | "number" | "boolean" | "hours";

export interface AmenityDetailField {
  key: string;
  type: AmenityDetailFieldType;
  label: string;
  options?: string[];
  placeholder?: string;
}

export interface AmenityCategory {
  id: string;
  label: string;
}

export interface AmenityCatalogEntry {
  id: string;
  label: string;
  categoryId: string;
  icon: string;
  detailSchema?: AmenityDetailField[];
}

// Format cible d'un élément de listings.amenities (jsonb), une fois l'étape 2
// livrée — remplace l'ancien tableau de chaînes (string[]).
export interface AmenityValue {
  id: string;
  details?: Record<string, unknown>;
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  { id: "essentiels", label: "Essentiels" },
  { id: "salle-de-bain", label: "Salle de bain" },
  { id: "chambre-et-linge", label: "Chambre et linge" },
  { id: "divertissement", label: "Divertissement" },
  { id: "famille", label: "Famille" },
  { id: "chauffage-et-climatisation", label: "Chauffage et climatisation" },
  { id: "securite", label: "Sécurité" },
  { id: "internet-et-bureau", label: "Internet et bureau" },
  { id: "cuisine-et-repas", label: "Cuisine et repas" },
  { id: "emplacement", label: "Emplacement" },
  { id: "exterieur", label: "Extérieur" },
  { id: "stationnement", label: "Stationnement" },
  { id: "services", label: "Services" },
];

export const AMENITY_CATALOG: AmenityCatalogEntry[] = [
  // Essentiels
  { id: "literie-serviettes", label: "Literie et serviettes incluses", categoryId: "essentiels", icon: "BedDouble" },
  { id: "savon-shampoing", label: "Savon et shampoing", categoryId: "essentiels", icon: "Droplet" },
  { id: "papier-hygienique", label: "Papier hygiénique", categoryId: "essentiels", icon: "Package" },
  { id: "produits-nettoyage", label: "Produits de nettoyage", categoryId: "essentiels", icon: "Sparkles" },

  // Salle de bain
  { id: "baignoire", label: "Baignoire", categoryId: "salle-de-bain", icon: "Bath" },
  { id: "seche-cheveux", label: "Sèche-cheveux", categoryId: "salle-de-bain", icon: "Wind" },
  { id: "serviettes-piscine", label: "Serviettes de piscine", categoryId: "salle-de-bain", icon: "Waves" },
  { id: "salle-de-bain-privee", label: "Salle de bain privée", categoryId: "salle-de-bain", icon: "DoorClosed" },

  // Chambre et linge
  { id: "cintres", label: "Cintres", categoryId: "chambre-et-linge", icon: "Shirt" },
  { id: "fer-a-repasser", label: "Fer à repasser", categoryId: "chambre-et-linge", icon: "Sparkles" },
  { id: "buanderie", label: "Buanderie", categoryId: "chambre-et-linge", icon: "WashingMachine" },
  { id: "draps-supplementaires", label: "Draps et oreillers supplémentaires", categoryId: "chambre-et-linge", icon: "BedDouble" },
  { id: "rideaux-occultants", label: "Rideaux occultants", categoryId: "chambre-et-linge", icon: "Moon" },

  // Divertissement
  { id: "table-billard", label: "Table de billard", categoryId: "divertissement", icon: "Disc" },
  { id: "babyfoot", label: "Babyfoot", categoryId: "divertissement", icon: "Users" },
  { id: "table-ping-pong", label: "Table de ping-pong", categoryId: "divertissement", icon: "CircleDot" },
  { id: "arcades", label: "Arcades", categoryId: "divertissement", icon: "Gamepad2" },
  { id: "jeux-societe", label: "Jeux de société", categoryId: "divertissement", icon: "Dices" },
  { id: "livres-revues", label: "Livres et revues", categoryId: "divertissement", icon: "BookOpen" },
  { id: "systeme-audio", label: "Système audio (musique)", categoryId: "divertissement", icon: "Speaker" },
  { id: "tv-cable", label: "Télévision avec câble", categoryId: "divertissement", icon: "Tv" },
  { id: "tv-intelligente", label: "Télévision intelligente", categoryId: "divertissement", icon: "Tv2" },
  { id: "gym", label: "Gym", categoryId: "divertissement", icon: "Dumbbell" },

  // Famille
  { id: "module-jeux-enfant", label: "Module de jeux pour enfant", categoryId: "famille", icon: "Baby" },
  { id: "lit-bebe", label: "Lit de bébé (parc)", categoryId: "famille", icon: "Baby" },
  { id: "chaise-haute", label: "Chaise haute", categoryId: "famille", icon: "Baby" },
  { id: "jeux-exterieurs-enfants", label: "Balançoire et jeux extérieurs", categoryId: "famille", icon: "Baby" },
  { id: "barrieres-securite", label: "Barrières de sécurité pour enfants", categoryId: "famille", icon: "ShieldCheck" },
  { id: "jouets-enfants", label: "Jouets et livres pour enfants", categoryId: "famille", icon: "Blocks" },

  // Chauffage et climatisation
  { id: "climatisation", label: "Climatisation", categoryId: "chauffage-et-climatisation", icon: "Snowflake" },
  { id: "chauffage-central", label: "Chauffage central", categoryId: "chauffage-et-climatisation", icon: "Thermometer" },
  { id: "foyer-interieur-bois", label: "Foyer intérieur au bois", categoryId: "chauffage-et-climatisation", icon: "Flame" },
  { id: "foyer-gaz", label: "Foyer au gaz", categoryId: "chauffage-et-climatisation", icon: "Flame" },
  { id: "thermopompe", label: "Thermopompe", categoryId: "chauffage-et-climatisation", icon: "Wind" },
  { id: "ventilateurs", label: "Ventilateurs", categoryId: "chauffage-et-climatisation", icon: "Fan" },

  // Sécurité
  { id: "detecteur-fumee", label: "Détecteur de fumée", categoryId: "securite", icon: "Siren" },
  { id: "detecteur-co", label: "Détecteur de monoxyde de carbone", categoryId: "securite", icon: "Siren" },
  { id: "extincteur", label: "Extincteur", categoryId: "securite", icon: "FireExtinguisher" },
  { id: "trousse-premiers-soins", label: "Trousse de premiers soins", categoryId: "securite", icon: "Cross" },
  { id: "camera-exterieure", label: "Caméra de sécurité extérieure", categoryId: "securite", icon: "Camera" },
  { id: "serrure-electronique", label: "Serrure électronique / boîte à clé", categoryId: "securite", icon: "KeyRound" },

  // Internet et bureau
  { id: "wifi", label: "Wifi", categoryId: "internet-et-bureau", icon: "Wifi" },
  { id: "espace-travail", label: "Espace de travail dédié (télétravail)", categoryId: "internet-et-bureau", icon: "Laptop" },
  { id: "bureau-ergonomique", label: "Bureau avec chaise ergonomique", categoryId: "internet-et-bureau", icon: "Briefcase" },

  // Cuisine et repas
  { id: "cuisine-complete", label: "Cuisine complète avec vaisselle et chaudrons", categoryId: "cuisine-et-repas", icon: "CookingPot" },
  { id: "refrigerateur", label: "Réfrigérateur", categoryId: "cuisine-et-repas", icon: "Refrigerator" },
  { id: "four", label: "Four", categoryId: "cuisine-et-repas", icon: "Flame" },
  { id: "cuisiniere", label: "Cuisinière (plaque de cuisson)", categoryId: "cuisine-et-repas", icon: "Flame" },
  { id: "micro-ondes", label: "Four à micro-ondes", categoryId: "cuisine-et-repas", icon: "Microwave" },
  { id: "lave-vaisselle", label: "Lave-vaisselle", categoryId: "cuisine-et-repas", icon: "Sparkles" },
  {
    id: "cafetiere",
    label: "Cafetière",
    categoryId: "cuisine-et-repas",
    icon: "Coffee",
    detailSchema: [
      { key: "type", type: "multi-select", label: "Type", options: ["Filtre", "Nespresso", "Espresso manuelle", "Percolateur"] },
    ],
  },
  { id: "vaisselle-ustensiles", label: "Vaisselle et ustensiles de base", categoryId: "cuisine-et-repas", icon: "UtensilsCrossed" },

  // Emplacement
  { id: "bord-eau", label: "Bord de l'eau", categoryId: "emplacement", icon: "Waves" },
  { id: "vue-panoramique", label: "Vue panoramique (lac ou montagne)", categoryId: "emplacement", icon: "Mountain" },
  { id: "ski-in-ski-out", label: "Ski in / Ski out", categoryId: "emplacement", icon: "Mountain" },
  { id: "situe-resort", label: "Situé sur un resort", categoryId: "emplacement", icon: "Building2" },
  { id: "sentiers-randonnee", label: "Sentiers de randonnée à proximité", categoryId: "emplacement", icon: "Footprints" },
  { id: "acces-motoneige-vtt", label: "Accès direct aux sentiers de motoneige/VTT", categoryId: "emplacement", icon: "Route" },

  // Extérieur
  { id: "terrasse", label: "Terrasse", categoryId: "exterieur", icon: "Armchair" },
  { id: "foyer-exterieur", label: "Foyer extérieur (firepit)", categoryId: "exterieur", icon: "Flame" },
  { id: "feu-de-camp", label: "Feu de camp autorisé", categoryId: "exterieur", icon: "Flame" },
  {
    id: "bbq",
    label: "BBQ",
    categoryId: "exterieur",
    icon: "Flame",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", options: ["Privé", "Partagé"] },
      { key: "type", type: "single-select", label: "Type", options: ["Gaz", "Charbon", "Bois"] },
    ],
  },
  {
    id: "spa",
    label: "Spa extérieur",
    categoryId: "exterieur",
    icon: "Waves",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", options: ["Privé", "Partagé"] },
      { key: "capacite", type: "number", label: "Capacité (personnes)", placeholder: "Ex. 6" },
      { key: "disponibleAnnee", type: "boolean", label: "Disponible toute l'année" },
    ],
  },
  { id: "sauna", label: "Sauna", categoryId: "exterieur", icon: "Thermometer" },
  {
    id: "piscine",
    label: "Piscine",
    categoryId: "exterieur",
    icon: "Waves",
    detailSchema: [
      { key: "acces", type: "single-select", label: "Accès", options: ["Privé", "Partagé", "Public"] },
      { key: "chauffee", type: "boolean", label: "Chauffée" },
      { key: "emplacement", type: "single-select", label: "Emplacement", options: ["Intérieure", "Extérieure"] },
      { key: "horaires", type: "hours", label: "Horaires d'ouverture" },
    ],
  },
  { id: "quai", label: "Quai", categoryId: "exterieur", icon: "Anchor" },
  { id: "acces-lac-riviere", label: "Accès direct à un lac ou une rivière", categoryId: "exterieur", icon: "Waves" },
  { id: "cabane-a-sucre", label: "Cabane à sucre sur le terrain", categoryId: "exterieur", icon: "TreePine" },
  { id: "patinoire", label: "Patinoire extérieure", categoryId: "exterieur", icon: "Snowflake" },
  { id: "chalet-bois-rond", label: "Chalet en bois rond", categoryId: "exterieur", icon: "TreePine" },

  // Stationnement
  {
    id: "stationnement",
    label: "Stationnement",
    categoryId: "stationnement",
    icon: "ParkingCircle",
    detailSchema: [
      { key: "places", type: "number", label: "Nombre de places", placeholder: "Ex. 4" },
      { key: "gratuit", type: "boolean", label: "Gratuit" },
    ],
  },
  { id: "stationnement-vr", label: "Espace pour VR ou remorque", categoryId: "stationnement", icon: "Truck" },
  { id: "garage", label: "Garage", categoryId: "stationnement", icon: "Warehouse" },
  { id: "borne-recharge-vr", label: "Borne de recharge pour véhicule électrique", categoryId: "stationnement", icon: "Zap" },

  // Services
  { id: "menage-inclus", label: "Ménage inclus", categoryId: "services", icon: "Sparkles" },
  { id: "arrivee-autonome", label: "Arrivée autonome (boîte à clé ou serrure électronique)", categoryId: "services", icon: "KeyRound" },
  { id: "conciergerie", label: "Service de conciergerie", categoryId: "services", icon: "ConciergeBell" },
  { id: "panier-bienvenue", label: "Panier de bienvenue", categoryId: "services", icon: "Gift" },
  { id: "location-equipement", label: "Location d'équipement sur place (kayak, vélo, motoneige)", categoryId: "services", icon: "Bike" },
  { id: "navette", label: "Service de navette", categoryId: "services", icon: "Car" },
];
