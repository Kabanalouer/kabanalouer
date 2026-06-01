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
