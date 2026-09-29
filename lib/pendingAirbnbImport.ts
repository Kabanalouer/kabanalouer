// Lien Airbnb saisi sur /devenir-hote, transmis au formulaire d'import de
// /dashboard/listings/new. Passe par ?import= dans l'URL ; localStorage sert
// de relais quand ce paramètre se perd (inscription par courriel : le lien de
// confirmation ouvre un nouvel onglet sur l'accueil).

const STORAGE_KEY = "kbn_pending_airbnb_import";
const MAX_LENGTH = 500;

export function normalizeAirbnbInput(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH || !/airbnb\./i.test(value)) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function savePendingAirbnbImport(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // Stockage indisponible (navigation privée) : le paramètre d'URL suffit.
  }
}

export function readPendingAirbnbImport(): string | null {
  try {
    return normalizeAirbnbInput(localStorage.getItem(STORAGE_KEY) ?? "");
  } catch {
    return null;
  }
}

export function clearPendingAirbnbImport(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à faire.
  }
}
