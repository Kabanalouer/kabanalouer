// Cadre géographique approximatif de chaque région (partie habitée), utilisé
// pour cadrer la carte des résultats quand une recherche par région ne donne
// aucun chalet. Clé = dbValue de lib/regions.ts.

export type GeoBounds = { north: number; south: number; east: number; west: number };

export const REGION_BOUNDS: Record<string, GeoBounds> = {
  "Laurentides": { north: 47.6, south: 45.5, west: -76.4, east: -73.6 },
  "Charlevoix": { north: 48.1, south: 47.2, west: -71.2, east: -69.8 },
  "Estrie (Cantons-de-l'Est)": { north: 46.0, south: 45.0, west: -72.9, east: -70.4 },
  "Lanaudière": { north: 47.7, south: 45.7, west: -75.5, east: -72.9 },
  "Mauricie": { north: 48.6, south: 46.2, west: -75.6, east: -71.9 },
  "Outaouais": { north: 47.8, south: 45.4, west: -79.0, east: -74.6 },
  "Saguenay–Lac-Saint-Jean": { north: 49.4, south: 47.6, west: -74.0, east: -69.6 },
  "Bas-Saint-Laurent": { north: 48.9, south: 46.9, west: -70.4, east: -67.0 },
  "Gaspésie–Îles-de-la-Madeleine": { north: 49.3, south: 47.2, west: -67.4, east: -61.3 },
  "Abitibi-Témiscamingue": { north: 49.1, south: 46.4, west: -79.6, east: -75.5 },
  "Côte-Nord": { north: 51.0, south: 48.0, west: -70.0, east: -59.0 },
  "Montérégie": { north: 46.1, south: 45.0, west: -74.5, east: -71.9 },
  "Chaudière-Appalaches": { north: 47.4, south: 45.4, west: -71.7, east: -69.6 },
  "Québec (ville et région)": { north: 47.6, south: 46.6, west: -72.6, east: -70.6 },
  "Centre-du-Québec": { north: 46.6, south: 45.6, west: -72.9, east: -71.4 },
  "Montréal": { north: 45.71, south: 45.40, west: -73.98, east: -73.47 },
  "Laval": { north: 45.70, south: 45.50, west: -73.90, east: -73.52 },
  "Eeyou Istchee Baie-James": { north: 55.0, south: 48.9, west: -79.6, east: -70.0 },
  "Nunavik": { north: 62.6, south: 55.0, west: -79.8, east: -63.5 },
};

// Recherche sans destination : le sud du Québec, là où sont les chalets
// (plutôt que tout le territoire jusqu'au Nunavik).
export const SOUTHERN_QUEBEC_BOUNDS: GeoBounds = { north: 49.3, south: 45.0, west: -79.5, east: -64.0 };
