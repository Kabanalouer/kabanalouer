import { formatPriceCad, type QuoteData } from "@/lib/quoteMessage";

const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export default function QuoteCard({
  quote,
  listingTitle,
  isMine,
}: {
  quote: QuoteData;
  listingTitle: string;
  isMine: boolean;
}) {
  const { checkIn, checkOut, numGuests, priceCents } = quote;
  const hasDates = !!checkIn;

  return (
    <div
      className={`max-w-[85%] md:max-w-sm w-full rounded-2xl overflow-hidden shadow-sm ${
        isMine ? "bg-primary text-white" : "bg-white border border-[#ebebeb] text-charcoal-800"
      }`}
    >
      {/* En-tête */}
      <div className={`px-4 pt-4 pb-3 border-b ${isMine ? "border-white/20" : "border-[#ebebeb]"}`}>
        <span
          className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 mb-2 ${
            isMine ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
          }`}
        >
          Devis
        </span>
        {listingTitle && (
          <p className={`text-sm font-semibold truncate ${isMine ? "text-white" : "text-charcoal-800"}`}>
            {listingTitle}
          </p>
        )}
        {hasDates && (
          <p className={`text-xs mt-1 flex items-center gap-1.5 ${isMine ? "text-white/70" : "text-charcoal-400"}`}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDateShort(checkIn!)}{checkOut ? ` → ${formatDateShort(checkOut)}` : ""}
            {numGuests ? ` · ${numGuests} voyageur${numGuests > 1 ? "s" : ""}` : ""}
          </p>
        )}
      </div>

      {/* Prix */}
      <div className="px-4 pt-3 pb-4">
        <p className={`text-xs mb-0.5 ${isMine ? "text-white/70" : "text-charcoal-400"}`}>Prix total (taxes incluses)</p>
        <p className={`text-2xl font-bold ${isMine ? "text-white" : "text-charcoal-800"}`}>{formatPriceCad(priceCents)}</p>
      </div>
    </div>
  );
}
