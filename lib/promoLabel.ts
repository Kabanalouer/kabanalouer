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

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
  });
}

// « sur les séjours du X au Y » ou « pour toutes réservations faites entre le X et le Y, peu importe la date du séjour »
function periodPhrase(promo: PromoDisplay): string | undefined {
  const { start_date, end_date, date_basis } = promo;
  if (!start_date || !end_date) return undefined;
  return date_basis === "booking"
    ? `pour toutes réservations faites entre le ${fmtDate(start_date)} et le ${fmtDate(end_date)}, peu importe la date du séjour`
    : `sur les séjours du ${fmtDate(start_date)} au ${fmtDate(end_date)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPromoLabel(promo: PromoDisplay): string {
  const { type, value, min_nights, days_before, end_date } = promo;
  const period = periodPhrase(promo);
  switch (type) {
    case "percent":
      return period ? `-${value}% ${period}` : `-${value}%`;
    case "amount":
      return period ? `-${value} $/nuit ${period}` : `-${value} $/nuit`;
    case "duration":
      return period
        ? `${min_nights} nuits pour le prix de ${value} ${period}`
        : end_date
        ? `${min_nights} nuits pour le prix de ${value} — jusqu'au ${fmtDate(end_date)}`
        : `${min_nights} nuits pour le prix de ${value}`;
    case "lastminute":
      return `-${value}% pour toute réservation faite moins de ${days_before} jours avant l'arrivée`;
    case "lastminute_amount":
      return `-${value} $/nuit pour toute réservation faite moins de ${days_before} jours avant l'arrivée`;
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

export function formatPromoLines(promo: PromoDisplay): { line1: string; line2?: string } {
  const { type, value, min_nights, days_before, start_date, end_date, date_basis } = promo;
  const period = periodPhrase(promo);
  if (type === "percent") {
    return { line1: `Promo -${value}%`, line2: period && capitalize(period) };
  }
  if (type === "amount") {
    return { line1: `Promo -${value} $/nuit`, line2: period && capitalize(period) };
  }
  if (type === "duration") {
    const nights = min_nights ?? 2;
    return {
      line1: "Nuitée GRATUITE",
      line2: start_date && end_date
        ? date_basis === "booking"
          ? `Sur tous les séjours de ${nights} nuits minimum réservés entre le ${fmtDate(start_date)} et le ${fmtDate(end_date)}, peu importe la date du séjour.`
          : `Sur tous les séjours de ${nights} nuits minimum du ${fmtDate(start_date)} au ${fmtDate(end_date)}.`
        : undefined,
    };
  }
  if (type === "lastminute") {
    return {
      line1: "Promo Dernière Minute",
      line2: `-${value}% pour toute réservation faite moins de ${days_before} jours avant l'arrivée`,
    };
  }
  if (type === "lastminute_amount") {
    return {
      line1: "Promo Dernière Minute",
      line2: `-${value} $/nuit pour toute réservation faite moins de ${days_before} jours avant l'arrivée`,
    };
  }
  return { line1: formatPromoLabel(promo) };
}
