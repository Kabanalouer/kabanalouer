// Demande de prix commencée par un visiteur non connecté (ContactForm),
// gardée pendant qu'il crée son compte : le lien de confirmation par courriel
// ouvre un nouvel onglet sur la fiche, où le formulaire est prérempli.
// Une entrée par annonce, expirée après 24 h.

const STORAGE_KEY_PREFIX = "kbn_pending_quote_";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface QuoteDraft {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  message: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 50;
}

export function savePendingQuoteDraft(listingId: string, draft: QuoteDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + listingId, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Stockage indisponible (navigation privée) : le formulaire repartira vide.
  }
}

export function readPendingQuoteDraft(listingId: string): QuoteDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + listingId);
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (typeof d.savedAt !== "number" || Date.now() - d.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + listingId);
      return null;
    }
    const checkin = typeof d.checkin === "string" && DATE_PATTERN.test(d.checkin) ? d.checkin : "";
    const checkout = typeof d.checkout === "string" && DATE_PATTERN.test(d.checkout) ? d.checkout : "";
    if (!isCount(d.adults) || !isCount(d.children) || !isCount(d.babies) || !isCount(d.pets)) return null;
    return {
      checkin,
      checkout,
      adults: Math.max(1, d.adults),
      children: d.children,
      babies: d.babies,
      pets: d.pets,
      message: typeof d.message === "string" ? d.message.slice(0, 5000) : "",
    };
  } catch {
    return null;
  }
}

export function clearPendingQuoteDraft(listingId: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + listingId);
  } catch {
    // Rien à faire.
  }
}
