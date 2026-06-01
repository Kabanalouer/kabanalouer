export type PromoRow = {
  id: string;
  listing_id: string;
  type: "percent" | "amount" | "duration" | "lastminute" | "lastminute_amount";
  value: number;
  min_nights: number | null;
  days_before: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export type PromoDisplay = Pick<
  PromoRow,
  "type" | "value" | "min_nights" | "days_before" | "start_date" | "end_date"
>;

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
  });
}

export function formatPromoLabel(promo: PromoDisplay): string {
  const { type, value, min_nights, days_before, start_date, end_date } = promo;
  switch (type) {
    case "percent":
      return start_date && end_date
        ? `-${value}% du ${fmtDate(start_date)} au ${fmtDate(end_date)}`
        : `-${value}%`;
    case "amount":
      return start_date && end_date
        ? `-${value} $ du ${fmtDate(start_date)} au ${fmtDate(end_date)}`
        : `-${value} $/nuit`;
    case "duration":
      return end_date
        ? `${min_nights} nuits pour le prix de ${value} — jusqu'au ${fmtDate(end_date)}`
        : `${min_nights} nuits pour le prix de ${value}`;
    case "lastminute":
      return `-${value}% pour toute réservation faite moins de ${days_before} jours avant l'arrivée`;
    case "lastminute_amount":
      return `-${value} $/nuit pour toute réservation faite moins de ${days_before} jours avant l'arrivée`;
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
  const { type, value, min_nights, days_before, start_date, end_date } = promo;
  if (type === "percent") {
    return {
      line1: `Promo -${value}%`,
      line2: start_date && end_date
        ? `Sur tous les séjours entre le ${fmtDate(start_date)} et ${fmtDate(end_date)}`
        : undefined,
    };
  }
  if (type === "amount") {
    return {
      line1: `Promo -${value} $/nuit`,
      line2: start_date && end_date
        ? `Sur tous les séjours entre le ${fmtDate(start_date)} et ${fmtDate(end_date)}`
        : undefined,
    };
  }
  if (type === "duration") {
    return {
      line1: "Nuitée GRATUITE",
      line2: start_date && end_date
        ? `Sur tous les séjours de ${min_nights ?? 2} nuits minimum entre le ${fmtDate(start_date)} et ${fmtDate(end_date)}.`
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
      line2: `-${value} $/nuit pour toute réservation faite moins de ${days_before} jours avant l'arrivée`,
    };
  }
  return { line1: formatPromoLabel(promo) };
}
