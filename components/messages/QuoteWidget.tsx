"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "./MessagesClient";

const MONTHS_SHORT_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT_FR[m - 1]}`;
}

// Valeur par défaut du modèle "fermeture" — utilisée telle quelle tant que le
// proprio n'a jamais rien sauvegardé. {prenomProprio}/{nomProprio} sont des
// jetons substitués à l'affichage puis remis en jetons avant sauvegarde
// (voir tokenizeClosing/detokenizeClosing plus bas).
const DEFAULT_CLOSING_TEMPLATE = [
  "COMMENT RÉSERVER ?\nSi vous désirez réserver ce chalet, vous avez simplement à me faire part de votre intérêt et je vous ferai parvenir les informations de paiements pour procéder au dépôt.",
  "Si vous avez des questions, n'hésitez surtout pas.\nCe serait un plaisir de vous accueillir chez nous.",
  "Bonne journée !",
  "{prenomProprio} {nomProprio}",
].join("\n\n");

const CLOSING_MARKER = "COMMENT RÉSERVER ?";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detokenizeClosing(text: string, hostFirstName: string, hostLastName: string): string {
  return text.replace(/\{prenomProprio\}/g, hostFirstName).replace(/\{nomProprio\}/g, hostLastName);
}

// Remet {prenomProprio}/{nomProprio} en jetons avant sauvegarde — pour qu'un
// futur devis (même si le nom du proprio changeait un jour) régénère
// toujours la bonne signature plutôt qu'un nom figé au moment de la sauvegarde.
function tokenizeClosing(text: string, hostFirstName: string, hostLastName: string): string {
  let result = text;
  if (hostFirstName) result = result.replace(new RegExp(escapeRegExp(hostFirstName), "g"), "{prenomProprio}");
  if (hostLastName) result = result.replace(new RegExp(escapeRegExp(hostLastName), "g"), "{nomProprio}");
  return result;
}

function buildHeaderBlock({
  travelerFirstName,
  listingTitle,
  checkIn,
  checkOut,
  numAdults,
  numChildren,
  numBabies,
  numPets,
}: {
  travelerFirstName: string | null;
  listingTitle: string;
  checkIn: string | null;
  checkOut: string | null;
  numAdults: number;
  numChildren: number;
  numBabies: number;
  numPets: number;
}): string {
  const humanTotal = numAdults + numChildren + numBabies;

  const datesLines = [
    checkIn ? `Arrivée : ${formatDateShort(checkIn)}` : null,
    checkOut ? `Départ : ${formatDateShort(checkOut)}` : null,
  ].filter((l): l is string => l !== null);
  const datesBlock = datesLines.length > 0 ? ["DATES", ...datesLines].join("\n") : null;

  const guestsBlock = [
    `NOMBRE TOTAL DE VOYAGEURS : ${humanTotal}`,
    `Adultes : ${numAdults}`,
    `Enfants (2 à 12 ans) : ${numChildren}`,
    `Bébés (0 à 2 ans) : ${numBabies}`,
    `Animaux : ${numPets}`,
  ].join("\n");

  // "PRIX$" est un jeton littéral que le proprio remplace lui-même dans le
  // textarea — texte brut, aucun champ numérique séparé (voir Correction 2).
  const priceBlock = ["PRIX", "PRIX$, toutes taxes comprises"].join("\n");

  return [
    travelerFirstName ? `Bonjour ${travelerFirstName},` : "Bonjour,",
    `Tout d'abord, merci pour votre intérêt pour ${listingTitle}.`,
    "Comme demandé, voici votre devis pour votre séjour :",
    datesBlock,
    guestsBlock,
    priceBlock,
  ].filter((l): l is string => l !== null).join("\n\n");
}

// Le proprio édite un texte complet (header régénéré automatiquement tant
// qu'il n'a pas commencé à éditer manuellement + section de fermeture
// personnalisable) puis l'envoie tel quel — voir app/api/messages/quote/route.ts,
// qui revalide sourceMessageId côté serveur et n'utilise jamais checkIn/
// checkOut/numAdults/etc. ci-dessous pour autre chose que régénérer l'aperçu.
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
}) {
  const supabase = createClient();

  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [hostFirstName, setHostFirstName] = useState("");
  const [hostLastName, setHostLastName] = useState("");
  const [closingTemplate, setClosingTemplate] = useState("");

  const [editedText, setEditedText] = useState("");
  const hasEditedText = useRef(false);

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const adultsCount = numAdults ?? 0;
  const childrenCount = numChildren ?? 0;
  const babiesCount = numBabies ?? 0;
  const petsCount = numPets ?? 0;

  // Chargement du modèle du proprio (self-read, RLS auth.uid() = id) — une
  // seule fois au montage.
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
      const closing = detokenizeClosing(savedTemplate ?? DEFAULT_CLOSING_TEMPLATE, firstName ?? "", lastName);
      setClosingTemplate(closing);
      setTemplateLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prix retiré du texte structuré — canSend ne dépend plus que d'un texte
  // non vide (le prix fait partie du texte libre, sans validation séparée).
  const canSend = !!editedText.trim();

  // Construit le texte initial une seule fois, dès que le modèle est chargé
  // — plus de régénération automatique liée au prix puisqu'il n'y a plus de
  // champ prix séparé.
  useEffect(() => {
    if (!templateLoaded || hasEditedText.current) return;
    const header = buildHeaderBlock({
      travelerFirstName,
      listingTitle,
      checkIn,
      checkOut,
      numAdults: adultsCount,
      numChildren: childrenCount,
      numBabies: babiesCount,
      numPets: petsCount,
    });
    setEditedText(`${header}\n\n${closingTemplate}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateLoaded, closingTemplate]);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");

    let closingTemplateToSave: string | undefined;
    if (saveAsTemplate) {
      const idx = editedText.indexOf(CLOSING_MARKER);
      if (idx !== -1) {
        closingTemplateToSave = tokenizeClosing(editedText.slice(idx), hostFirstName, hostLastName);
      }
    }

    const res = await fetch("/api/messages/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        receiverId,
        sourceMessageId,
        editedContent: editedText,
        saveAsTemplate,
        closingTemplateToSave,
      }),
    });

    if (!res.ok) {
      setError("Erreur lors de l'envoi du devis. Réessayez.");
      setSending(false);
      return;
    }

    const { message } = await res.json();
    setSending(false);
    onSent(message as Message);
  };

  if (!templateLoaded) {
    return <p className="text-xs text-charcoal-400">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label className="block text-xs font-medium text-charcoal-500 mb-1">
          Texte du devis
        </label>
        <textarea
          value={editedText}
          onChange={(e) => {
            hasEditedText.current = true;
            setEditedText(e.target.value);
          }}
          rows={14}
          className="w-full border border-[#ebebeb] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y whitespace-pre-wrap"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-charcoal-500 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsTemplate}
          onChange={(e) => setSaveAsTemplate(e.target.checked)}
          className="rounded border-[#ebebeb] text-primary focus:ring-primary/20"
        />
        Enregistrer ce texte de fermeture comme modèle pour la prochaine fois
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSend}
        disabled={sending || !canSend}
        className="self-start bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        {sending ? "Envoi en cours…" : "Envoyer le devis"}
      </button>
    </div>
  );
}
