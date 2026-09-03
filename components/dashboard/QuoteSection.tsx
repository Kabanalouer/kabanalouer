"use client";

import { useTranslations } from "next-intl";

// Section "Devis" — remplie une seule fois par le proprio, réutilisée pour
// chaque devis structuré envoyé dans la messagerie. Suit le pattern d'ajout/
// suppression dynamique de RoomsSection.tsx (pas AmenitiesPicker.tsx, qui est
// un catalogue de cases à cocher fixe, pas une liste libre).

function DynamicStringList({
  items,
  onChange,
  placeholder,
  emptyLabel,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  emptyLabel: string;
  addLabel: string;
}) {
  const update = (i: number, value: string) =>
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <div>
      {items.length === 0 && (
        <p className="text-xs text-charcoal-300 mb-2">{emptyLabel}</p>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 border border-[#ebebeb] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => remove(i)}
              className="text-charcoal-300 hover:text-red-400 transition-colors p-1 shrink-0"
              aria-label="Supprimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-2 text-xs text-primary font-medium hover:text-primary-dark transition-colors"
      >
        {addLabel}
      </button>
    </div>
  );
}

export default function QuoteSection({
  inclusions,
  exclusions,
  bookingInstructions,
  onInclusionsChange,
  onExclusionsChange,
  onBookingInstructionsChange,
}: {
  inclusions: string[];
  exclusions: string[];
  bookingInstructions: string;
  onInclusionsChange: (items: string[]) => void;
  onExclusionsChange: (items: string[]) => void;
  onBookingInstructionsChange: (value: string) => void;
}) {
  const t = useTranslations("listings.quote");

  return (
    <div className="space-y-8">
      {/* Message explicatif */}
      <div className="border-l-[3px] border-[#636e40] bg-[#f5f6ec] rounded-r-xl px-4 py-3">
        <p className="text-sm text-charcoal-700">{t("intro")}</p>
      </div>

      {/* Ce qui est compris */}
      <div>
        <h3 className="font-semibold text-charcoal-800 mb-3">{t("inclusionsTitle")}</h3>
        <DynamicStringList
          items={inclusions}
          onChange={onInclusionsChange}
          placeholder={t("inclusionsPlaceholder")}
          emptyLabel={t("inclusionsEmpty")}
          addLabel={t("addInclusion")}
        />
      </div>

      <div className="border-t border-[#ebebeb]" />

      {/* Ce qui n'est pas compris */}
      <div>
        <h3 className="font-semibold text-charcoal-800 mb-3">{t("exclusionsTitle")}</h3>
        <DynamicStringList
          items={exclusions}
          onChange={onExclusionsChange}
          placeholder={t("exclusionsPlaceholder")}
          emptyLabel={t("exclusionsEmpty")}
          addLabel={t("addExclusion")}
        />
      </div>

      <div className="border-t border-[#ebebeb]" />

      {/* Comment réserver */}
      <div>
        <h3 className="font-semibold text-charcoal-800 mb-3">{t("bookingTitle")}</h3>
        <textarea
          value={bookingInstructions}
          onChange={(e) => onBookingInstructionsChange(e.target.value)}
          rows={5}
          placeholder={t("bookingPlaceholder")}
          className="w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
  );
}
