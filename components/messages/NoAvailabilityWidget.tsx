"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  SIGNATURE_TOKEN,
  TRAVELER_FIRST_NAME_TOKEN,
  LISTING_TITLE_TOKEN,
  detokenizeMessage,
  tokenizeMessage,
} from "@/lib/quoteMessage";
import type { Message } from "./MessagesClient";

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Gabarit par défaut, jetons non substitués — utilisé tant que le proprio
// n'a jamais sauvegardé son propre modèle.
function buildDefaultTemplate(t: Translate): string {
  return [
    t("greeting", { name: TRAVELER_FIRST_NAME_TOKEN }),
    t("noAvailabilityIntro", { title: LISTING_TITLE_TOKEN }),
    t("noAvailabilityIntroSentence"),
    t("noAvailabilityFlexible"),
    t("noAvailabilityClosing"),
    SIGNATURE_TOKEN,
  ].join("\n\n");
}

// Calque QuoteWidget.tsx (texte complet édité côté client, modèle sauvegardé
// couvrant tout le message) mais sans dates/voyageurs/prix — voir
// app/api/messages/quote/route.ts, qui accepte type: "no_availability" et
// écrit no_availability_template_closing au lieu de quote_template_closing.
export default function NoAvailabilityWidget({
  listingId,
  receiverId,
  sourceMessageId,
  travelerFirstName,
  listingTitle,
  onSent,
  onCancel,
}: {
  listingId: string;
  receiverId: string;
  sourceMessageId: string;
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

  // Chargement du modèle du proprio (self-read, RLS auth.uid() = id) et
  // construction du texte initial — une seule fois au montage.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTemplateLoaded(true); return; }
      const { data } = await supabase
        .from("users")
        .select("name, no_availability_template_closing")
        .eq("id", user.id)
        .single();

      const fullName = (data?.name as string | undefined) ?? "";
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");
      setHostFirstName(firstName ?? "");
      setHostLastName(lastName);

      const savedTemplate = (data?.no_availability_template_closing as string | null) ?? null;
      if (!hasEditedText.current) {
        setEditedText(
          detokenizeMessage(savedTemplate ?? buildDefaultTemplate(t), {
            hostFirstName: firstName ?? "",
            hostLastName: lastName,
            travelerFirstName,
            listingTitle,
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
      ? tokenizeMessage(editedText, { hostFirstName, hostLastName, travelerFirstName, listingTitle })
      : undefined;

    const res = await fetch("/api/messages/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "no_availability",
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
          {t("noAvailabilityTextareaLabel")}
        </label>
        <textarea
          value={editedText}
          onChange={(e) => {
            hasEditedText.current = true;
            setEditedText(e.target.value);
          }}
          rows={10}
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
          {sending ? t("sendingGeneric") : t("sendNoAvailabilityButton")}
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
