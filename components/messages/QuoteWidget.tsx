"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  SIGNATURE_TOKEN,
  TRAVELER_FIRST_NAME_TOKEN,
  LISTING_TITLE_TOKEN,
  DATES_GUESTS_TOKEN,
  detokenizeMessage,
  tokenizeMessage,
} from "@/lib/quoteMessage";
import type { Message } from "./MessagesClient";

const MONTHS_SHORT_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_FR[m - 1]}`;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Bloc dates + voyageurs — seule partie du message qui reste toujours
// calculée depuis les vraies données de CETTE demande, jamais figée dans le
// modèle sauvegardé (remplacée par DATES_GUESTS_TOKEN à la sauvegarde, voir
// lib/quoteMessage.ts).
function buildDatesGuestsBlock(
  t: Translate,
  {
    checkIn,
    checkOut,
    numAdults,
    numChildren,
    numBabies,
    numPets,
  }: {
    checkIn: string | null;
    checkOut: string | null;
    numAdults: number;
    numChildren: number;
    numBabies: number;
    numPets: number;
  }
): string {
  const humanTotal = numAdults + numChildren + numBabies;

  const datesLines = [
    checkIn ? t("arrivalLabel", { date: formatDateShort(checkIn) }) : null,
    checkOut ? t("departureLabel", { date: formatDateShort(checkOut) }) : null,
  ].filter((l): l is string => l !== null);
  const datesBlock = datesLines.length > 0 ? [t("datesHeading"), ...datesLines].join("\n") : null;

  const guestsBlock = [
    t("guestsTotalLabel", { count: humanTotal }),
    t("adultsLabel", { count: numAdults }),
    t("childrenLabel", { count: numChildren }),
    t("babiesLabel", { count: numBabies }),
    t("petsLabel", { count: numPets }),
  ].join("\n");

  return [datesBlock, guestsBlock].filter((l): l is string => l !== null).join("\n\n");
}

// Gabarit par défaut, jetons non substitués — utilisé tant que le proprio
// n'a jamais sauvegardé son propre modèle.
function buildDefaultTemplate(t: Translate): string {
  return [
    t("greeting", { name: TRAVELER_FIRST_NAME_TOKEN }),
    t("quoteIntro", { title: LISTING_TITLE_TOKEN }),
    t("quoteComingUp"),
    DATES_GUESTS_TOKEN,
    // "PRIX$" est un jeton littéral que le proprio remplace lui-même dans le
    // textarea — texte brut, aucun champ numérique séparé (voir Correction 2).
    [t("priceHeading"), t("priceLine")].join("\n"),
    `${t("reservationHeading")}\n${t("reservationParagraph")}`,
    t("defaultClosingBlock2"),
    t("defaultClosingBlock3"),
    SIGNATURE_TOKEN,
  ].join("\n\n");
}

// Le proprio édite le texte complet du devis (salutation, intro, dates,
// voyageurs, prix, section de réservation) puis l'envoie tel quel — voir
// app/api/messages/quote/route.ts, qui revalide sourceMessageId côté
// serveur. Le modèle sauvegardé (quote_template_closing) couvre maintenant
// tout le message : nom du voyageur, titre du chalet et bloc dates/
// voyageurs sont remis en jetons avant sauvegarde pour rester dynamiques au
// prochain envoi (voir lib/quoteMessage.ts, detokenizeMessage/tokenizeMessage).
export default function QuoteWidget({
  listingId,
  receiverId,
  sourceMessageId,
  checkIn,
  checkOut,
  numAdults,
  numChildren,
  numBabies,
  numPets,
  travelerFirstName,
  listingTitle,
  onSent,
  onCancel,
}: {
  listingId: string;
  receiverId: string;
  sourceMessageId: string;
  checkIn: string | null;
  checkOut: string | null;
  numAdults: number | null;
  numChildren: number | null;
  numBabies: number | null;
  numPets: number | null;
  travelerFirstName: string | null;
  listingTitle: string;
  onSent: (insertedMessage: Message) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("quote");
  const supabase = createClient();

  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [hostFirstName, setHostFirstName] = useState("");
  const [hostLastName, setHostLastName] = useState("");

  const [editedText, setEditedText] = useState("");
  const hasEditedText = useRef(false);

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const adultsCount = numAdults ?? 0;
  const childrenCount = numChildren ?? 0;
  const babiesCount = numBabies ?? 0;
  const petsCount = numPets ?? 0;

  const datesGuestsBlock = buildDatesGuestsBlock(t, {
    checkIn,
    checkOut,
    numAdults: adultsCount,
    numChildren: childrenCount,
    numBabies: babiesCount,
    numPets: petsCount,
  });

  // Chargement du modèle du proprio (self-read, RLS auth.uid() = id) et
  // construction du texte initial — une seule fois au montage.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTemplateLoaded(true); return; }
      const { data } = await supabase
        .from("users")
        .select("name, quote_template_closing")
        .eq("id", user.id)
        .single();

      const fullName = (data?.name as string | undefined) ?? "";
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");
      setHostFirstName(firstName ?? "");
      setHostLastName(lastName);

      const savedTemplate = (data?.quote_template_closing as string | null) ?? null;
      if (!hasEditedText.current) {
        setEditedText(
          detokenizeMessage(savedTemplate ?? buildDefaultTemplate(t), {
            hostFirstName: firstName ?? "",
            hostLastName: lastName,
            travelerFirstName,
            listingTitle,
            datesGuestsBlock,
          })
        );
      }
      setTemplateLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSend = !!editedText.trim();

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");

    const closingTemplateToSave = saveAsTemplate
      ? tokenizeMessage(editedText, {
          hostFirstName,
          hostLastName,
          travelerFirstName,
          listingTitle,
          datesGuestsBlock,
        })
      : undefined;

    const res = await fetch("/api/messages/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quote",
        listingId,
        receiverId,
        sourceMessageId,
        editedContent: editedText,
        saveAsTemplate,
        closingTemplateToSave,
      }),
    });

    if (!res.ok) {
      setError(t("sendError"));
      setSending(false);
      return;
    }

    const { message } = await res.json();
    setSending(false);
    onSent(message as Message);
  };

  if (!templateLoaded) {
    return <p className="text-sm text-charcoal-400">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label className="block text-sm font-medium text-charcoal-500 mb-1">
          {t("quoteTextareaLabel")}
        </label>
        <textarea
          value={editedText}
          onChange={(e) => {
            hasEditedText.current = true;
            setEditedText(e.target.value);
          }}
          rows={14}
          className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y whitespace-pre-wrap"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal-500 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsTemplate}
          onChange={(e) => setSaveAsTemplate(e.target.checked)}
          className="rounded border-[#ebebeb] text-primary focus:ring-primary/20"
        />
        {t("saveTemplateCheckbox")}
      </label>

      {error && <p className="text-sm text-error-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !canSend}
          className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {sending ? t("sendingGeneric") : t("sendQuoteButton")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white border border-[#ebebeb] text-charcoal-600 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-charcoal-50 transition-colors"
        >
          {t("cancelButton")}
        </button>
      </div>
    </div>
  );
}
