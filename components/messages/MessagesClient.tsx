"use client";

import { useState, useEffect, useRef } from "react";
import { BIO_COLUMNS, localizedBio, type BioFields } from "@/lib/bio";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import QuoteCard from "./QuoteCard";
import QuoteWidget from "./QuoteWidget";
import NoAvailabilityWidget from "./NoAvailabilityWidget";
import PhoneReminderBanner from "@/components/PhoneReminderBanner";
import type { QuoteData } from "@/lib/quoteMessage";
import { buildListingPath } from "@/lib/listingUrl";
import PhotoReminderBanner from "@/components/PhotoReminderBanner";
import Link from "next/link";
import { localePath } from "@/lib/localePath";
import AutoTextarea from "@/components/AutoTextarea";

export type Message = {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  content_translated: string | null;
  translated_language: string | null;
  is_read: boolean;
  language: string | null;
  check_in: string | null;
  check_out: string | null;
  num_guests: number | null;
  num_adults: number | null;
  num_children: number | null;
  num_babies: number | null;
  num_pets: number | null;
  quote_data: QuoteData | null;
  created_at: string;
  sender: { id: string; name: string; avatar_url: string | null };
  receiver: { id: string; name: string; avatar_url: string | null };
};

type Conversation = {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_bio: string | null;
  other_user_created_at: string | null;
  listing_id: string;
  listing_title: string;
  listing_title_en: string | null;
  listing_host_id: string | null;
  listing_region: string | null;
  listing_city: string | null;
  listing_number: number | null;
  listing_custom_slug: string | null;
  last_message: string;
  // Traduction automatique du dernier message, seulement s'il a été REÇU par
  // l'utilisateur courant — même règle que l'affichage du fil (showTranslation).
  last_message_translated: string | null;
  last_message_at: string;
  unread_count: number;
};

// Heures et dates à l'heure du Québec, sur le serveur comme dans le navigateur :
// sans fuseau fixe, le rendu serveur (UTC) diffère de celui du téléphone et
// React signale une erreur d'hydratation.
const TIME_ZONE = "America/Montreal";

// Heure seule si le dernier message est d'aujourd'hui, sinon date courte —
// même convention que les autres listes admin du projet (jour + mois abrégé).
function formatConversationDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const localeCode = locale === "en" ? "en-CA" : "fr-CA";
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  return day(date) === day(new Date())
    ? date.toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
    : date.toLocaleDateString(localeCode, { day: "numeric", month: "short", timeZone: TIME_ZONE });
}

export default function MessagesClient({
  currentUserId,
  currentUserLanguage,
  initialTranslationEnabled,
  initialConversations,
  hasPhone,
  hasAvatar,
  isHost,
}: {
  currentUserId: string;
  currentUserLanguage: string;
  initialTranslationEnabled: boolean;
  initialConversations: Conversation[];
  hasPhone: boolean;
  hasAvatar: boolean;
  isHost: boolean;
}) {
  const t = useTranslations("messages");
  const tq = useTranslations("quote");
  const [phoneBannerHidden, setPhoneBannerHidden] = useState(false);
  const locale = useLocale();
  const isEn = locale === "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const selectedListingId = searchParams.get("listing");
  const selectedWithId = searchParams.get("with");

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Mobile : panneau « Détails » (fiche, traduction, fiche du voyageur)
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDetailsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailsOpen]);
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    selectedListingId && selectedWithId ? "thread" : "list"
  );
  // Réglage global par utilisateur (pas par conversation) — contrôle
  // uniquement l'affichage des traductions REÇUES, jamais l'envoi.
  const [translationEnabled, setTranslationEnabled] = useState(initialTranslationEnabled);
  // Identifie le message de demande de devis pour lequel un widget de
  // réponse rapide (devis ou non-disponibilité) est actuellement ouvert
  // inline, et lequel des deux — un seul widget à la fois, remplace l'ancien
  // toggle global "Message libre / Devis structuré" au bas de la conversation.
  const [activeQuickReply, setActiveQuickReply] = useState<{ messageId: string; type: "quote" | "no_availability" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Lus par l'abonnement de la liste (créé une seule fois) pour savoir si un
  // nouveau message arrive dans la conversation déjà ouverte.
  const selectedListingIdRef = useRef<string | null>(selectedListingId);
  const selectedWithIdRef = useRef<string | null>(selectedWithId);
  const conversationsRef = useRef<Conversation[]>(initialConversations);

  const convTitle = (c: Conversation) => (isEn && c.listing_title_en?.trim()) || c.listing_title;

  const activeConv = conversations.find(
    (c) => c.listing_id === selectedListingId && c.other_user_id === selectedWithId
  );
  // Lien vers la fiche publique du chalet (icône cliquable dans l'en-tête du
  // fil) — même construction que ListingCard.tsx. null si la région est
  // inconnue ou si l'annonce n'a ni lien personnalisé ni numéro d'annonce.
  const activeListingPath = activeConv
    ? buildListingPath(
        {
          region: activeConv.listing_region,
          city: activeConv.listing_city,
          listing_number: activeConv.listing_number,
          custom_slug: activeConv.listing_custom_slug,
        },
        locale === "en" ? "en" : "fr"
      )
    : null;
  // L'action rapide "Devis structuré" n'est offerte que si l'utilisateur
  // courant est le proprio de l'annonce concernée par CETTE conversation
  // précise (pas juste son rôle global — un même compte peut être proprio
  // d'un chalet et avoir contacté un autre proprio ailleurs comme voyageur).
  const isHostOfListing = !!activeConv && activeConv.listing_host_id === currentUserId;

  useEffect(() => {
    setActiveQuickReply(null);
  }, [selectedListingId, selectedWithId]);

  useEffect(() => {
    if (!selectedListingId || !selectedWithId) return;

    setLoadingMessages(true);

    supabase
      .from("messages")
      .select("*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)")
      .or(
        `and(listing_id.eq.${selectedListingId},sender_id.eq.${currentUserId},receiver_id.eq.${selectedWithId}),and(listing_id.eq.${selectedListingId},sender_id.eq.${selectedWithId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoadingMessages(false);
      });

    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("listing_id", selectedListingId)
      .eq("sender_id", selectedWithId)
      .eq("receiver_id", currentUserId)
      .eq("is_read", false)
      .then(() => {});
  }, [selectedListingId, selectedWithId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime : INSERT pour les nouveaux messages, UPDATE pour la traduction
  // automatique posée en arrière-plan après l'envoi (voir /api/messages).
  useEffect(() => {
    if (!selectedListingId || !selectedWithId) return;

    const isRelevant = (senderId: string, receiverId: string) =>
      (senderId === currentUserId && receiverId === selectedWithId) ||
      (senderId === selectedWithId && receiverId === currentUserId);

    const channel = supabase
      .channel(`messages:${selectedListingId}:${selectedWithId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${selectedListingId}`,
        },
        async (payload) => {
          const msg = payload.new as Message;
          if (!isRelevant(msg.sender_id, msg.receiver_id)) return;

          const { data } = await supabase
            .from("messages")
            .select("*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)")
            .eq("id", msg.id)
            .single();

          if (data) {
            // Anti-doublon : le devis structuré est déjà ajouté de façon
            // optimiste dès la réponse de /api/messages/quote (voir onSent
            // plus bas) — cet événement Realtime arrive ensuite pour tout le
            // monde, dont l'expéditeur lui-même, sans dédoublonnage il
            // apparaîtrait deux fois.
            setMessages((prev) => (prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]));
          }

          if (msg.receiver_id === currentUserId) {
            await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${selectedListingId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (!isRelevant(msg.sender_id, msg.receiver_id)) return;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? { ...m, content_translated: msg.content_translated, translated_language: msg.translated_language }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedListingId, selectedWithId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Liste des conversations en direct : tout message reçu ou envoyé (depuis un
  // autre onglet, ou une réponse par courriel) remonte sa conversation en tête
  // de liste ; une conversation inconnue (premier message) y est ajoutée.
  useEffect(() => {
    const handleInsert = async (msg: Message) => {
      const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
      const isOpen = msg.listing_id === selectedListingIdRef.current && otherId === selectedWithIdRef.current;
      const addUnread = msg.receiver_id === currentUserId && !isOpen ? 1 : 0;

      const known = conversationsRef.current.some((c) => c.listing_id === msg.listing_id && c.other_user_id === otherId);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.listing_id === msg.listing_id && c.other_user_id === otherId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          last_message: msg.content,
          last_message_translated: null,
          last_message_at: msg.created_at,
          unread_count: prev[idx].unread_count + addUnread,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
      if (known) return;

      const [{ data: other }, { data: listing }] = await Promise.all([
        supabase.from("public_profiles").select(`name, avatar_url, created_at, ${BIO_COLUMNS}`).eq("id", otherId).single(),
        supabase.from("listings").select("title, title_en, host_id, region, city, listing_number, custom_slug").eq("id", msg.listing_id).single(),
      ]);
      const conv: Conversation = {
        other_user_id: otherId,
        other_user_name: (other?.name as string | null) ?? "—",
        other_user_avatar: (other?.avatar_url as string | null) ?? null,
        other_user_bio: localizedBio(other as BioFields | null, locale),
        other_user_created_at: (other?.created_at as string | null) ?? null,
        listing_id: msg.listing_id,
        listing_title: (listing?.title as string | null) ?? "",
        listing_title_en: (listing?.title_en as string | null) ?? null,
        listing_host_id: (listing?.host_id as string | null) ?? null,
        listing_region: (listing?.region as string | null) ?? null,
        listing_city: (listing?.city as string | null) ?? null,
        listing_number: (listing?.listing_number as number | null) ?? null,
        listing_custom_slug: (listing?.custom_slug as string | null) ?? null,
        last_message: msg.content,
        last_message_translated: null,
        last_message_at: msg.created_at,
        unread_count: addUnread,
      };
      setConversations((prev) =>
        prev.some((c) => c.listing_id === conv.listing_id && c.other_user_id === conv.other_user_id) ? prev : [conv, ...prev]
      );
    };

    const channel = supabase
      .channel(`conversation-list:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${currentUserId}` },
        (payload) => handleInsert(payload.new as Message))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${currentUserId}` },
        (payload) => handleInsert(payload.new as Message))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Conversation ouverte → son point « non lu » disparaît aussitôt (les
  // messages sont marqués lus à l'ouverture, voir le chargement du fil).
  useEffect(() => {
    selectedListingIdRef.current = selectedListingId;
    selectedWithIdRef.current = selectedWithId;
    if (!selectedListingId || !selectedWithId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.listing_id === selectedListingId && c.other_user_id === selectedWithId && c.unread_count > 0
          ? { ...c, unread_count: 0 }
          : c
      )
    );
  }, [selectedListingId, selectedWithId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedListingId || !selectedWithId) return;
    setSending(true);

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: selectedListingId,
        receiverId: selectedWithId,
        content: newMessage.trim(),
      }),
    });

    setNewMessage("");
    setSending(false);
  };

  // Ordinateur : Entrée envoie (Maj+Entrée = nouvelle ligne). Écran tactile :
  // Entrée fait une nouvelle ligne, on envoie avec le bouton — comme dans
  // les applications de messagerie.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !isTouch) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectConversation = (conv: Conversation) => {
    setMobileView("thread");
    router.push(localePath(`/messages?listing=${conv.listing_id}&with=${conv.other_user_id}`, locale));
  };

  const handleBack = () => {
    setMobileView("list");
    router.push(localePath("/messages", locale));
  };

  const handleToggleTranslation = async () => {
    const newValue = !translationEnabled;
    setTranslationEnabled(newValue);
    await supabase.from("users").update({ translation_enabled: newValue }).eq("id", currentUserId);
  };

  return (
    // Mobile: 100dvh (hauteur réellement visible, suit les barres du navigateur) - navbar(80px) - bottom nav(64px). Desktop: 100dvh - navbar(80px).
    // Colonne : le bandeau (hauteur naturelle) puis la ligne sidebar/thread en
    // flex-1, pour que la hauteur totale reste calée sur le viewport que le
    // bandeau soit affiché ou non.
    <div className="flex flex-col h-[calc(100dvh-144px)] md:h-[calc(100dvh-80px)]">
      {/* Un seul rappel à la fois : le cellulaire (alertes texto) d'abord ; dès
          qu'il est rempli ou que son bandeau est fermé, la photo prend la place. */}
      {!hasPhone && !phoneBannerHidden ? (
        <div className={`px-4 pt-4 shrink-0 ${mobileView === "thread" ? "hidden md:block" : ""}`}>
          <PhoneReminderBanner show onHidden={() => setPhoneBannerHidden(true)} />
        </div>
      ) : !hasAvatar ? (
        <div className={`px-4 pt-4 shrink-0 ${mobileView === "thread" ? "hidden md:block" : ""}`}>
          <PhotoReminderBanner />
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">

      {/* Sidebar: conversation list */}
      <div className={`flex-col bg-white border-r border-[#ebebeb] w-full md:w-80 ${mobileView === "list" ? "flex" : "hidden"} md:flex`}>
        <div className="p-4 border-b border-[#ebebeb]">
          <h1 className="font-bold text-charcoal-800 text-heading-3">{t("title")}</h1>
          {/* Mobile : la liste est seule à l'écran, l'invite se place ici */}
          {conversations.length > 0 && !selectedListingId && (
            <p className="md:hidden text-sm text-charcoal-500 mt-1">{t("selectHintMobile")}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-base text-charcoal-500">{t("emptyList")}</p>
              {!isHost && (
                <Link
                  href={localePath("/chalets", locale)}
                  className="md:hidden mt-4 inline-flex bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  {t("browseCabins")}
                </Link>
              )}
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive =
                conv.listing_id === selectedListingId && conv.other_user_id === selectedWithId;
              return (
                <button
                  key={`${conv.listing_id}-${conv.other_user_id}`}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-4 hover:bg-charcoal-50 transition-colors border-b border-charcoal-50 ${
                    isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-charcoal-100 flex-shrink-0 overflow-hidden">
                      {conv.other_user_avatar ? (
                        <Image
                          src={conv.other_user_avatar}
                          alt={conv.other_user_name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-600 font-bold text-sm">
                          {conv.other_user_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-charcoal-800 text-base truncate">
                          {conv.other_user_name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-charcoal-400">
                            {formatConversationDate(conv.last_message_at, locale)}
                          </span>
                          {conv.unread_count > 0 && (
                            <span className="w-2 h-2 rounded-full bg-accent" aria-label={t("unread")} />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-charcoal-400 truncate mt-0.5">{convTitle(conv)}</p>
                      <p className="text-sm text-charcoal-500 truncate mt-0.5">
                        {(translationEnabled && conv.last_message_translated) || conv.last_message}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main: thread view */}
      <div className={`flex-1 min-w-0 flex-col bg-charcoal-50 ${mobileView === "thread" ? "flex" : "hidden"} md:flex`}>
        {!selectedListingId || !selectedWithId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-full bg-white border border-[#ebebeb] shadow-sm flex items-center justify-center mx-auto mb-5">
                <svg className="w-9 h-9 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <h2 className="text-heading-2 font-semibold text-charcoal-800 mb-2">{t("emptyTitle")}</h2>
              <p className="text-base text-charcoal-500 leading-relaxed">
                {conversations.length > 0 ? t("selectHint") : isHost ? t("emptyHintHost") : t("emptyHintTraveler")}
              </p>
              {conversations.length === 0 && !isHost && (
                <Link
                  href={localePath("/chalets", locale)}
                  className="mt-6 inline-flex bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
                >
                  {t("browseCabins")}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-[#ebebeb] px-2 md:px-6 py-2 md:py-4 flex items-center gap-2 md:gap-3">
              {/* Retour — mobile seulement, icône seule */}
              <button
                onClick={handleBack}
                className="md:hidden w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-charcoal-700 hover:bg-charcoal-50 transition-colors shrink-0"
                aria-label={t("backToList")}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              {activeConv && (
                <>
                  <div className="w-9 h-9 rounded-full bg-charcoal-100 overflow-hidden flex-shrink-0">
                    {activeConv.other_user_avatar ? (
                      <Image
                        src={activeConv.other_user_avatar}
                        alt={activeConv.other_user_name}
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-600 font-bold text-sm">
                        {activeConv.other_user_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Mobile : nom + chalet sur une ligne chacun, touchable → Détails */}
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="md:hidden flex-1 min-w-0 text-left"
                    aria-label={t("detailsOpen")}
                  >
                    <p className="font-semibold text-charcoal-800 text-base leading-tight truncate">{activeConv.other_user_name}</p>
                    <p className="text-sm text-charcoal-400 leading-tight truncate">{convTitle(activeConv)}</p>
                  </button>
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="font-semibold text-charcoal-800 text-base">{activeConv.other_user_name}</p>
                    <div className="flex items-center gap-1 min-w-0">
                      {activeListingPath ? (
                        <a
                          href={activeListingPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("viewListing")}
                          className="text-sm text-charcoal-400 truncate max-w-xs hover:underline"
                        >
                          {convTitle(activeConv)}
                        </a>
                      ) : (
                        <p className="text-sm text-charcoal-400 truncate max-w-xs">{convTitle(activeConv)}</p>
                      )}
                      {activeListingPath && (
                        <a
                          href={activeListingPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("viewListing")}
                          title={t("viewListing")}
                          className="text-charcoal-400 hover:text-primary transition-colors shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5m0-4.5L11 13.5M6 6H4.5a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5V15" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Mobile : bouton Détails (remplace l'interrupteur et le lien) */}
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-charcoal-600 hover:bg-charcoal-50 transition-colors shrink-0"
                aria-label={t("detailsOpen")}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>

              <div className="hidden md:flex ml-auto flex-shrink-0 items-center gap-2">
                <span className="text-xs text-charcoal-400">{t("translationToggleLabel")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={translationEnabled}
                  aria-label={t("translationToggleLabel")}
                  onClick={handleToggleTranslation}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    translationEnabled ? "bg-primary" : "bg-charcoal-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      translationEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 flex flex-col gap-3">
              {/* Fiche du voyageur, visible seulement par le proprio de l'annonce */}
              {isHostOfListing && activeConv && (
                <div className="hidden md:block"><TravelerCard conv={activeConv} /></div>
              )}
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-charcoal-400 text-sm">{t("loading")}</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-charcoal-400 text-base">
                  {t("startConversation")}
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const showTranslation = !isMine && !!msg.content_translated && translationEnabled;

                  if (msg.quote_data) {
                    return (
                      <div key={msg.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                        <QuoteCard content={msg.content} isMine={isMine} type={msg.quote_data.type ?? "quote"} />
                      </div>
                    );
                  }

                  // Demande de devis : message du voyageur (jamais du proprio),
                  // avec dates + voyageurs remplis, pas déjà une réponse
                  // (quote_data exclu ci-dessus) — l'action rapide n'est
                  // proposée qu'au vrai proprio de cette annonce.
                  const isQuoteRequest =
                    isHostOfListing && !isMine && !!msg.check_in && !!msg.check_out && !!msg.num_guests;

                  return (
                    <div key={msg.id} className={`flex flex-col gap-1.5 ${isMine ? "items-end" : "items-start"}`}>
                      <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] md:max-w-sm min-w-0 px-4 py-2.5 rounded-2xl text-base leading-relaxed [overflow-wrap:anywhere] ${
                            isMine
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-white text-charcoal-800 shadow-sm rounded-bl-sm"
                          }`}
                        >
                          {showTranslation && (
                            <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">
                              {t("translatedBadge")}
                            </span>
                          )}

                          <p className="whitespace-pre-wrap">
                            {showTranslation ? msg.content_translated : msg.content}
                          </p>

                          {showTranslation && (
                            <p className="whitespace-pre-wrap text-charcoal-400 text-sm mt-2 pt-2 border-t border-[#ebebeb]">
                              {msg.content}
                            </p>
                          )}

                          <p
                            className={`text-xs mt-1 ${
                              isMine ? "text-white/50" : "text-charcoal-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString(isEn ? "en-CA" : "fr-CA", {
                              timeZone: TIME_ZONE,
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {isQuoteRequest && activeConv && (
                        <div className="max-w-[80%] md:max-w-sm w-full">
                          {activeQuickReply?.messageId === msg.id ? (
                            <div className="bg-white border border-[#ebebeb] rounded-2xl p-3 shadow-sm">
                              {activeQuickReply.type === "quote" ? (
                                <QuoteWidget
                                  listingId={activeConv.listing_id}
                                  receiverId={activeConv.other_user_id}
                                  sourceMessageId={msg.id}
                                  checkIn={msg.check_in}
                                  checkOut={msg.check_out}
                                  numAdults={msg.num_adults}
                                  numChildren={msg.num_children}
                                  numBabies={msg.num_babies}
                                  numPets={msg.num_pets}
                                  travelerFirstName={activeConv.other_user_name?.split(" ")[0] ?? null}
                                  listingTitle={convTitle(activeConv)}
                                  onSent={(insertedMessage) => {
                                    setActiveQuickReply(null);
                                    // Affichage optimiste immédiat — ne pas attendre l'événement
                                    // Realtime (dédoublonné plus haut quand il arrive ensuite).
                                    setMessages((prev) =>
                                      prev.some((m) => m.id === insertedMessage.id) ? prev : [...prev, insertedMessage]
                                    );
                                  }}
                                  onCancel={() => setActiveQuickReply(null)}
                                />
                              ) : (
                                <NoAvailabilityWidget
                                  listingId={activeConv.listing_id}
                                  receiverId={activeConv.other_user_id}
                                  sourceMessageId={msg.id}
                                  travelerFirstName={activeConv.other_user_name?.split(" ")[0] ?? null}
                                  listingTitle={convTitle(activeConv)}
                                  onSent={(insertedMessage) => {
                                    setActiveQuickReply(null);
                                    setMessages((prev) =>
                                      prev.some((m) => m.id === insertedMessage.id) ? prev : [...prev, insertedMessage]
                                    );
                                  }}
                                  onCancel={() => setActiveQuickReply(null)}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-nowrap gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveQuickReply({ messageId: msg.id, type: "quote" })}
                                className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                              >
                                {tq("sendQuoteCta")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveQuickReply({ messageId: msg.id, type: "no_availability" })}
                                className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-white border border-[#ebebeb] text-charcoal-600 hover:bg-charcoal-50 transition-colors"
                              >
                                {tq("sendNoAvailabilityCta")}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Panneau « Détails » (mobile) — glisse depuis le bas */}
            {detailsOpen && activeConv && (
              <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("detailsTitle")}>
                <button type="button" aria-label={t("detailsClose")} className="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)} />
                <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[85dvh] overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5">
                  <div className="mx-auto w-10 h-1 rounded-full bg-charcoal-200" aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <h2 className="text-heading-3 font-semibold text-charcoal-800">{t("detailsTitle")}</h2>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(false)}
                      aria-label={t("detailsClose")}
                      className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-charcoal-500 hover:bg-charcoal-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div>
                    <p className="text-sm text-charcoal-400">{t("detailsCabin")}</p>
                    <p className="text-base font-semibold text-charcoal-800">{convTitle(activeConv)}</p>
                    {activeListingPath && (
                      <a
                        href={activeListingPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        {t("viewListing")}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5m0-4.5L11 13.5M6 6H4.5a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5V15" /></svg>
                      </a>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4 border-t border-[#ebebeb] pt-5">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-charcoal-800">{t("translationToggleLabel")}</p>
                      <p className="text-sm text-charcoal-500 mt-0.5">{t("translationExplain")}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={translationEnabled}
                      aria-label={t("translationToggleLabel")}
                      onClick={handleToggleTranslation}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${translationEnabled ? "bg-primary" : "bg-charcoal-200"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${translationEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {isHostOfListing && (
                    <div className="border-t border-[#ebebeb] pt-5">
                      <TravelerCard conv={activeConv} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input — toujours le message libre : l'action "Devis structuré"
                vit maintenant en ligne, sous chaque message de demande de
                devis précis (voir la boucle des messages ci-dessus). */}
            <div id="message-composer" className="bg-white border-t border-[#ebebeb] px-3 sm:px-4 py-3">
              <div className="flex gap-2 sm:gap-3 items-end">
                <AutoTextarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("messagePlaceholder")}
                  aria-label={t("messagePlaceholder")}
                  rows={1}
                  maxHeight={160}
                  className="flex-1 min-w-0 border border-[#ebebeb] rounded-3xl px-4 py-2.5 text-base leading-6 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  aria-label={isEn ? "Send" : "Envoyer"}
                  className="bg-primary text-white w-11 h-11 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40 flex-shrink-0 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="hidden sm:inline">{sending ? "…" : isEn ? "Send" : "Envoyer"}</span>
                </button>
              </div>
              <p className="hidden [@media(pointer:fine)]:block mt-1.5 px-1 text-xs text-charcoal-400">{t("composerHint")}</p>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ── Fiche du voyageur (côté proprio) ──────────────────────────────────────────
function TravelerCard({ conv }: { conv: Conversation }) {
  const t = useTranslations("messages");
  const locale = useLocale();
  const firstName = conv.other_user_name.split(" ")[0];
  const memberSince = conv.other_user_created_at
    ? new Date(conv.other_user_created_at).toLocaleDateString(locale === "en" ? "en-CA" : "fr-CA", { month: "long", year: "numeric", timeZone: TIME_ZONE })
    : null;

  return (
    <div className="border border-[#ebebeb] rounded-2xl p-4 flex gap-4 items-start bg-white shrink-0">
      <div className="w-14 h-14 rounded-full bg-charcoal-100 overflow-hidden flex-shrink-0">
        {conv.other_user_avatar ? (
          <Image src={conv.other_user_avatar} alt={firstName} width={56} height={56} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-charcoal-600 font-bold text-lg">
            {firstName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-charcoal-800">{t("travelerCardTitle", { name: firstName })}</p>
        {memberSince && <p className="text-sm text-charcoal-400">{t("travelerMemberSince", { date: memberSince })}</p>}
        <p className={`text-sm mt-2 leading-relaxed ${conv.other_user_bio ? "text-charcoal-600" : "text-charcoal-400 italic"}`}>
          {conv.other_user_bio ?? t("travelerNoBio", { name: firstName })}
        </p>
      </div>
    </div>
  );
}
