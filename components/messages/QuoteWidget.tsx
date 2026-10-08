"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getMonthNamesShort } from "@/lib/dateLocale";
import { createClient } from "@/lib/supabase/client";
import {
  SIGNATURE_TOKEN,
  TRAVELER_FIRST_NAME_TOKEN,
  LISTING_TITLE_TOKEN,
  DATES_GUESTS_TOKEN,
  PRICE_TOKEN,
  formatQuotePrice,
  parseQuotePrice,
  detokenizeMessage,
  tokenizeMessage,
} from "@/lib/quoteMessage";
import type { Message } from "./MessagesClient";
import AutoTextarea from "@/components/AutoTextarea";

const MONTHS_SHORT_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function formatDateShort(iso: string, locale: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (locale === "en") return `${getMonthNamesShort("en")[m - 1]} ${d}`;
  return `${d} ${MONTHS_SHORT_FR[m - 1]}`;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Bloc dates + voyageurs — seule partie du message qui reste toujours
// calculée depuis les vraies données de CETTE demande, jamais figée dans le
// modèle sauvegardé (remplacée par DATES_GUESTS_TOKEN à la sauvegarde, voir
// lib/quoteMessage.ts).
function buildDatesGuestsBlock(
  t: Translate,
  locale: string,
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
    checkIn ? t("arrivalLabel", { date: formatDateShort(checkIn, locale) }) : null,
    checkOut ? t("departureLabel", { date: formatDateShort(checkOut, locale) }) : null,
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
    // Rempli depuis le champ « Prix total » au-dessus du texte.
    [t("priceHeading"), t("priceLine", { price: PRICE_TOKEN })].join("\n"),
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
  const locale = useLocale();
  const supabase = createClient();

  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [hostFirstName, setHostFirstName] = useState("");
  const [hostLastName, setHostLastName] = useState("");

  const [editedText, setEditedText] = useState("");
  const hasEditedText = useRef(false);

  // Champ « Prix total » : le prix tapé est recopié dans le texte, à la place
  // de ce qui y est inscrit pour l'instant (le repère « ____ $ » au départ).
  // C'est le texte qui fait foi : le proprio peut aussi écrire son prix
  // directement dedans. Seul le repère encore présent bloque l'envoi.
  const pricePlaceholder = t("priceInTextPlaceholder");
  const [priceInput, setPriceInput] = useState("");
  const priceCents = parseQuotePrice(priceInput);
  const [priceInText, setPriceInText] = useState(pricePlaceholder);
  const placeholderInText = editedText.includes(pricePlaceholder);
  // Prix du champ remplacé à la main dans le texte : le champ ne suit plus.
  const priceEditedInText = priceCents !== null && !editedText.includes(priceInText);

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    const cents = parseQuotePrice(value);
    const next = cents ? formatQuotePrice(cents, locale) : pricePlaceholder;
    setEditedText((text) => writePriceInText(text, priceInText, next));
    setPriceInText(next);
  };

  // Où écrire le prix du champ : à la place du prix inscrit en dernier ; sinon
  // sur la ligne « …, toutes taxes comprises » ; sinon sous le titre « PRIX »
  // (le proprio a pu écrire un prix à la main puis l'effacer).
  const writePriceInText = (text: string, previous: string, next: string): string => {
    if (text.includes(previous)) return text.replace(previous, next);
    const lines = text.split("\n");
    const suffix = t("priceLine", { price: "" });
    const lineIndex = lines.findIndex((l) => l.trimEnd().endsWith(suffix.trim()));
    if (lineIndex !== -1) {
      lines[lineIndex] = t("priceLine", { price: next });
      return lines.join("\n");
    }
    const headingIndex = lines.findIndex((l) => l.trim() === t("priceHeading"));
    if (headingIndex !== -1) {
      const after = lines[headingIndex + 1];
      if (after !== undefined && after.trim() === "") lines[headingIndex + 1] = t("priceLine", { price: next });
      else lines.splice(headingIndex + 1, 0, t("priceLine", { price: next }));
      return lines.join("\n");
    }
    return text;
  };

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const adultsCount = numAdults ?? 0;
  const childrenCount = numChildren ?? 0;
  const babiesCount = numBabies ?? 0;
  const petsCount = numPets ?? 0;

  const datesGuestsBlock = buildDatesGuestsBlock(t, locale, {
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
            priceDisplay: priceInText,
          })
        );
      }
      setTemplateLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSend = !!editedText.trim() && !placeholderInText;

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
          priceDisplay: priceInText,
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
        // Prix enregistré seulement s'il correspond encore au texte envoyé.
        priceCents: priceEditedInText ? null : priceCents,
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
      <div className="rounded-xl bg-[#f5f6ec] border border-primary/20 p-4">
        <label htmlFor="quote-price" className="block text-sm font-semibold text-charcoal-800 mb-2">
          {t("priceFieldLabel")}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-44">
            {locale === "en" && (
              <span className="absolute inset-y-0 left-4 flex items-center text-2xl font-semibold text-charcoal-400 pointer-events-none">$</span>
            )}
            <input
              id="quote-price"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder={t("priceFieldPlaceholder")}
              aria-invalid={priceInput.trim() !== "" && priceCents === null}
              className={`w-full bg-white border border-[#ebebeb] rounded-xl py-2.5 text-2xl font-semibold text-charcoal-800 placeholder-charcoal-300 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                locale === "en" ? "pl-9 pr-4" : "pl-4 pr-9"
              }`}
            />
            {locale !== "en" && (
              <span className="absolute inset-y-0 right-4 flex items-center text-2xl font-semibold text-charcoal-400 pointer-events-none">$</span>
            )}
          </div>
          <span className="text-sm text-charcoal-500">{t("priceFieldTaxes")}</span>
        </div>
        {priceInput.trim() !== "" && priceCents === null && (
          <p className="mt-2 text-sm text-error-600">{t("priceInvalid")}</p>
        )}
        {priceEditedInText && (
          <p className="mt-2 text-sm text-charcoal-500">{t("priceEditedInText")}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-500">
          {t("quoteTextareaLabel")}
        </label>
        <p className="text-sm text-charcoal-400 mb-1">{t("textEditableNote")}</p>
        <AutoTextarea
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
        {/* Bulle au survol sur le conteneur : un bouton désactivé ne reçoit
            pas les événements de souris dans tous les navigateurs. */}
        <span className="relative group inline-flex">
          <button
            onClick={handleSend}
            disabled={sending || !canSend}
            className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {sending ? t("sendingGeneric") : t("sendQuoteButton")}
          </button>
          {placeholderInText && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 rounded-lg bg-charcoal-800 px-3 py-2 text-sm text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {t("priceRequired")}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white border border-[#ebebeb] text-charcoal-600 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-charcoal-50 transition-colors"
        >
          {t("cancelButton")}
        </button>
      </div>
      {/* Pas de survol sur un écran tactile : même consigne, en texte. */}
      {placeholderInText && (
        <p className="text-sm text-charcoal-400 md:hidden">{t("priceRequired")}</p>
      )}
    </div>
  );
}
