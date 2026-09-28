export type PromoRow = {
  id: string;
  listing_id: string;
  type: "percent" | "amount" | "duration" | "lastminute" | "lastminute_amount";
  value: number;
  min_nights: number | null;
  days_before: number | null;
  start_date: string | null;
  end_date: string | null;
  // "stay" = dates de séjour visées, "booking" = période où la réservation doit être faite
  date_basis: "stay" | "booking";
  is_active: boolean;
  created_at: string;
};

export type PromoDisplay = Pick<
  PromoRow,
  "type" | "value" | "min_nights" | "days_before" | "start_date" | "end_date" | "date_basis"
>;

// Colonnes à sélectionner pour afficher une promo
export const PROMO_DISPLAY_COLUMNS = "type, value, min_nights, days_before, start_date, end_date, date_basis";

// Filtre PostgREST (.or) des promos visibles aujourd'hui :
// - dernière minute (% ou $) : toujours
// - dates de séjour : dès la création, jusqu'à la fin de la période de séjour
// - dates de réservation : seulement pendant la période de réservation
export function visiblePromoFilter(today: string): string {
  return [
    "type.in.(lastminute,lastminute_amount)",
    `and(date_basis.eq.stay,end_date.gte.${today})`,
    `and(date_basis.eq.booking,start_date.lte.${today},end_date.gte.${today})`,
  ].join(",");
}

type PromoLocale = "fr" | "en";

function lang(locale?: string): PromoLocale {
  return locale === "en" ? "en" : "fr";
}

function fmtDate(dateStr: string, l: PromoLocale): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString(l === "en" ? "en-CA" : "fr-CA", {
    day: "numeric",
    month: "long",
  });
}

// Montant du rabais : « 20% » / « 50 $/nuit » (FR) ou « 20% » / « $50/night » (EN)
function amountLabel(type: PromoDisplay["type"], value: number, l: PromoLocale): string {
  const perNight = type === "amount" || type === "lastminute_amount";
  if (!perNight) return `${value}%`;
  return l === "en" ? `$${value}/night` : `${value} $/nuit`;
}

// « sur les séjours du X au Y » ou « pour toutes réservations faites entre le X et le Y, peu importe la date du séjour »
function periodPhrase(promo: PromoDisplay, l: PromoLocale): string | undefined {
  const { start_date, end_date, date_basis } = promo;
  if (!start_date || !end_date) return undefined;
  const from = fmtDate(start_date, l);
  const to = fmtDate(end_date, l);
  if (l === "en") {
    return date_basis === "booking"
      ? `for all bookings made between ${from} and ${to}, whatever the stay dates`
      : `on stays from ${from} to ${to}`;
  }
  return date_basis === "booking"
    ? `pour toutes réservations faites entre le ${from} et le ${to}, peu importe la date du séjour`
    : `sur les séjours du ${from} au ${to}`;
}

function lastMinutePhrase(promo: PromoDisplay, l: PromoLocale): string {
  const amount = amountLabel(promo.type, promo.value, l);
  return l === "en"
    ? `-${amount} for any booking made less than ${promo.days_before} days before arrival`
    : `-${amount} pour toute réservation faite moins de ${promo.days_before} jours avant l'arrivée`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPromoLabel(promo: PromoDisplay, locale?: string): string {
  const l = lang(locale);
  const { type, value, min_nights, end_date } = promo;
  const period = periodPhrase(promo, l);
  switch (type) {
    case "percent":
    case "amount": {
      const amount = `-${amountLabel(type, value, l)}`;
      return period ? `${amount} ${period}` : amount;
    }
    case "duration": {
      const base = l === "en"
        ? `${min_nights} nights for the price of ${value}`
        : `${min_nights} nuits pour le prix de ${value}`;
      if (period) return `${base} ${period}`;
      if (end_date) return l === "en" ? `${base} — until ${fmtDate(end_date, l)}` : `${base} — jusqu'au ${fmtDate(end_date, l)}`;
      return base;
    }
    case "lastminute":
    case "lastminute_amount":
      return lastMinutePhrase(promo, l);
    default:
      return "";
  }
}

export function isLastminuteVisible(promo: PromoDisplay, checkinDate: string | null | undefined): boolean {
  if (promo.type !== "lastminute" && promo.type !== "lastminute_amount") return true;
  if (!checkinDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkin = new Date(checkinDate + "T00:00:00");
  const daysUntil = Math.floor((checkin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil >= 0 && daysUntil <= (promo.days_before ?? 7);
}

export function formatPromoLines(promo: PromoDisplay, locale?: string): { line1: string; line2?: string } {
  const l = lang(locale);
  const { type, value, min_nights, start_date, end_date, date_basis } = promo;
  const period = periodPhrase(promo, l);
  if (type === "percent" || type === "amount") {
    return { line1: `Promo -${amountLabel(type, value, l)}`, line2: period && capitalize(period) };
  }
  if (type === "duration") {
    const nights = min_nights ?? 2;
    let line2: string | undefined;
    if (start_date && end_date) {
      const from = fmtDate(start_date, l);
      const to = fmtDate(end_date, l);
      if (l === "en") {
        line2 = date_basis === "booking"
          ? `On all stays of ${nights} nights or more booked between ${from} and ${to}, whatever the stay dates.`
          : `On all stays of ${nights} nights or more from ${from} to ${to}.`;
      } else {
        line2 = date_basis === "booking"
          ? `Sur tous les séjours de ${nights} nuits minimum réservés entre le ${from} et le ${to}, peu importe la date du séjour.`
          : `Sur tous les séjours de ${nights} nuits minimum du ${from} au ${to}.`;
      }
    }
    return { line1: l === "en" ? "FREE night" : "Nuitée GRATUITE", line2 };
  }
  if (type === "lastminute" || type === "lastminute_amount") {
    return {
      line1: l === "en" ? "Last-minute deal" : "Promo Dernière Minute",
      line2: lastMinutePhrase(promo, l),
    };
  }
  return { line1: formatPromoLabel(promo, locale) };
}

// Page SEO « chalets à louer pas chers » (chalets avec une promo active) —
// segment unique sous /chalets et /en/cabins, résolu avant les régions dans
// app/chalets/[...segments]/page.tsx.
export const DEALS_SLUG_FR = "pas-cher";
export const DEALS_SLUG_EN = "deals";
export const DEALS_PATH_FR = `/chalets/${DEALS_SLUG_FR}`;
export const DEALS_PATH_EN = `/en/cabins/${DEALS_SLUG_EN}`;
// En dessous de ce nombre de chalets en promo, la page est en noindex et
// absente du sitemap (une page presque vide nuit au référencement).
export const MIN_DEAL_LISTINGS_FOR_INDEX = 5;

// Famille de promo, pour les filtres de la page
export type PromoFamily = "rabais" | "nuit-gratuite" | "derniere-minute";
export function promoFamily(type: PromoRow["type"]): PromoFamily {
  if (type === "duration") return "nuit-gratuite";
  if (type === "lastminute" || type === "lastminute_amount") return "derniere-minute";
  return "rabais";
}
