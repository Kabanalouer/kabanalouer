import { formatPriceCad, type QuoteData } from "@/lib/quoteMessage";

const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function scrollToComposer() {
  document.getElementById("message-composer")?.scrollIntoView({ behavior: "smooth", block: "end" });
}

export default function QuoteCard({
  quote,
  listingTitle,
}: {
  quote: QuoteData;
  listingTitle: string;
}) {
  const { checkIn, checkOut, numGuests, priceCents } = quote;
  const hasDates = !!checkIn;

  return (
    <div className="max-w-[85%] md:max-w-sm w-full bg-white border border-[#ebebeb] rounded-2xl overflow-hidden shadow-sm">
      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 border-b border-[#ebebeb]">
        <span className="inline-flex items-center bg-primary/10 text-primary text-xs font-semibold rounded-full px-2.5 py-1 mb-2">
          Devis
        </span>
        {listingTitle && (
          <p className="text-sm font-semibold text-charcoal-800 truncate">{listingTitle}</p>
        )}
        {hasDates && (
          <p className="text-xs text-charcoal-400 mt-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDateShort(checkIn!)}{checkOut ? ` → ${formatDateShort(checkOut)}` : ""}
            {numGuests ? ` · ${numGuests} voyageur${numGuests > 1 ? "s" : ""}` : ""}
          </p>
        )}
      </div>

      {/* Prix */}
      <div className="px-4 pt-3 pb-3 border-b border-[#ebebeb]">
        <p className="text-xs text-charcoal-400 mb-0.5">Prix total (taxes incluses)</p>
        <p className="text-2xl font-bold text-charcoal-800">{formatPriceCad(priceCents)}</p>
      </div>

      {/* Zone d'actions — accueillera un bouton de paiement sécurisé une fois Stripe Express en place */}
      <div className="px-4 py-3 flex justify-end">
        <button
          type="button"
          onClick={scrollToComposer}
          className="text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-full px-4 py-1.5 transition-colors"
        >
          Répondre
        </button>
      </div>
    </div>
  );
}
