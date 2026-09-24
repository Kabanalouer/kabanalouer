"use client";

import { useTranslations } from "next-intl";
import type { QuoteReplyType } from "@/lib/quoteMessage";

// Affiche le texte intégral du devis ou de la réponse "non disponible"
// (messages.content, édité par le proprio dans QuoteWidget.tsx /
// NoAvailabilityWidget.tsx) — même rendu de bulle que les messages texte
// normaux, juste un petit badge en plus (différencié par type). quote_data
// (checkIn/checkOut/numGuests/numAdults/numChildren/numBabies/numPets/
// priceCents) reste stocké sur la ligne pour un usage futur (recherche, tri,
// paiement Stripe Express) mais n'est plus utilisé ici pour le rendu — voir
// discussion dans le résumé de tâche avant de retirer quoi que ce soit de ce côté.
export default function QuoteCard({
  content,
  isMine,
  type,
}: {
  content: string;
  isMine: boolean;
  type: QuoteReplyType;
}) {
  const t = useTranslations("quote");
  const isNoAvailability = type === "no_availability";

  return (
    <div
      className={`max-w-[80%] md:max-w-sm px-4 py-2.5 rounded-2xl text-base leading-relaxed ${
        isMine
          ? "bg-primary text-white rounded-br-sm"
          : "bg-white text-charcoal-800 shadow-sm rounded-bl-sm"
      }`}
    >
      <span
        className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 mb-1.5 ${
          isMine
            ? "bg-white/15 text-white"
            : isNoAvailability
              ? "bg-error-50 text-error-600"
              : "bg-primary/10 text-primary"
        }`}
      >
        {isNoAvailability ? t("badgeNoAvailability") : t("badgeQuote")}
      </span>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}
