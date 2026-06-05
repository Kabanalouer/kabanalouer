"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Message = {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  language: string | null;
  created_at: string;
  sender: { id: string; name: string; avatar_url: string | null };
  receiver: { id: string; name: string; avatar_url: string | null };
};

type Conversation = {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  listing_id: string;
  listing_title: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export default function MessagesClient({
  currentUserId,
  currentUserLanguage,
  initialConversations,
}: {
  currentUserId: string;
  currentUserLanguage: string;
  initialConversations: Conversation[];
}) {
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
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    selectedListingId && selectedWithId ? "thread" : "list"
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [expandedOriginals, setExpandedOriginals] = useState<Set<string>>(new Set());
  const [translationDisabled, setTranslationDisabled] = useState(false);
  const translationDisabledRef = useRef(false);
  const translatedIds = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(
    (c) => c.listing_id === selectedListingId && c.other_user_id === selectedWithId
  );

  // Keep ref in sync for use in async callbacks
  useEffect(() => {
    translationDisabledRef.current = translationDisabled;
  }, [translationDisabled]);

  // Load translation preference from localStorage when conversation changes
  useEffect(() => {
    if (!selectedListingId) return;
    const stored = localStorage.getItem(`translation_disabled_${selectedListingId}`);
    const isDisabled = stored === "true";
    setTranslationDisabled(isDisabled);
    translationDisabledRef.current = isDisabled;
    setExpandedOriginals(new Set());
  }, [selectedListingId]);

  const translateMessage = useCallback(
    async (msg: Message) => {
      if (msg.sender_id === currentUserId) return;
      if (translatedIds.current.has(msg.id)) return;
      const msgLang = msg.language || "fr";
      const myLang = currentUserLanguage || "fr";
      if (msgLang === myLang) return;

      translatedIds.current.add(msg.id);

      try {
        const res = await fetch("/api/translate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: msg.content, fromLanguage: msgLang, toLanguage: myLang }),
        });
        if (res.ok) {
          const { translation } = (await res.json()) as { translation: string };
          setTranslations((prev) => ({ ...prev, [msg.id]: translation }));
        } else {
          translatedIds.current.delete(msg.id);
        }
      } catch {
        translatedIds.current.delete(msg.id);
      }
    },
    [currentUserId, currentUserLanguage]
  );

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
        const msgs = (data as Message[]) ?? [];
        setMessages(msgs);
        setLoadingMessages(false);
        if (!translationDisabledRef.current) {
          msgs.forEach((msg) => translateMessage(msg));
        }
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

  // Translate when translation is re-enabled
  useEffect(() => {
    if (!translationDisabled && messages.length > 0) {
      messages.forEach((msg) => translateMessage(msg));
    }
  }, [translationDisabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    if (!selectedListingId || !selectedWithId) return;

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
          const isRelevant =
            (msg.sender_id === currentUserId && msg.receiver_id === selectedWithId) ||
            (msg.sender_id === selectedWithId && msg.receiver_id === currentUserId);

          if (!isRelevant) return;

          const { data } = await supabase
            .from("messages")
            .select("*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)")
            .eq("id", msg.id)
            .single();

          if (data) {
            const newMsg = data as Message;
            setMessages((prev) => [...prev, newMsg]);
            if (!translationDisabledRef.current) translateMessage(newMsg);
          }

          if (msg.receiver_id === currentUserId) {
            await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedListingId, selectedWithId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedListingId || !selectedWithId) return;
    setSending(true);

    await supabase.from("messages").insert({
      listing_id: selectedListingId,
      sender_id: currentUserId,
      receiver_id: selectedWithId,
      content: newMessage.trim(),
      language: currentUserLanguage || "fr",
    });

    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectConversation = (conv: Conversation) => {
    setMobileView("thread");
    router.push(`/messages?listing=${conv.listing_id}&with=${conv.other_user_id}`);
  };

  const handleBack = () => {
    setMobileView("list");
    router.push("/messages");
  };

  const toggleOriginal = (msgId: string) => {
    setExpandedOriginals((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const toggleTranslation = () => {
    const newValue = !translationDisabled;
    setTranslationDisabled(newValue);
    translationDisabledRef.current = newValue;
    if (selectedListingId) {
      localStorage.setItem(`translation_disabled_${selectedListingId}`, String(newValue));
    }
  };

  const hasTranslatableMessages = messages.some(
    (msg) =>
      msg.sender_id !== currentUserId &&
      (msg.language || "fr") !== (currentUserLanguage || "fr")
  );

  return (
    // Mobile: 100vh - navbar(80px) - bottom nav(64px). Desktop: 100vh - navbar(80px).
    <div className="flex h-[calc(100vh-144px)] md:h-[calc(100vh-80px)]">

      {/* Sidebar: conversation list */}
      <div className={`flex-col bg-white border-r border-[#ebebeb] w-full md:w-80 ${mobileView === "list" ? "flex" : "hidden"} md:flex`}>
        <div className="p-4 border-b border-[#ebebeb]">
          <h1 className="font-bold text-charcoal-800 text-lg">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-charcoal-400 text-sm">
              Aucune conversation pour le moment.
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
                    <div className="w-10 h-10 rounded-full bg-charcoal-200 flex-shrink-0 overflow-hidden">
                      {conv.other_user_avatar ? (
                        <Image
                          src={conv.other_user_avatar}
                          alt={conv.other_user_name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-500 font-bold text-sm">
                          {conv.other_user_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-charcoal-800 text-sm truncate">
                          {conv.other_user_name}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-400 truncate mt-0.5">{conv.listing_title}</p>
                      <p className="text-xs text-charcoal-500 truncate mt-0.5">{conv.last_message}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main: thread view */}
      <div className={`flex-1 flex-col bg-charcoal-50 ${mobileView === "thread" ? "flex" : "hidden"} md:flex`}>
        {!selectedListingId || !selectedWithId ? (
          <div className="flex-1 flex items-center justify-center text-charcoal-400">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white border border-[#ebebeb] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-medium text-charcoal-500">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-[#ebebeb] px-4 md:px-6 py-4 flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                onClick={handleBack}
                className="md:hidden flex items-center gap-1 text-sm font-medium text-charcoal-600 hover:text-charcoal-800 transition-colors shrink-0"
                aria-label="Retour à la liste"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Retour
              </button>

              {activeConv && (
                <>
                  <div className="w-9 h-9 rounded-full bg-charcoal-200 overflow-hidden flex-shrink-0">
                    {activeConv.other_user_avatar ? (
                      <Image
                        src={activeConv.other_user_avatar}
                        alt={activeConv.other_user_name}
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-500 font-bold text-sm">
                        {activeConv.other_user_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal-800 text-sm">{activeConv.other_user_name}</p>
                    <p className="text-xs text-charcoal-400 truncate max-w-xs">{activeConv.listing_title}</p>
                  </div>
                </>
              )}

              {hasTranslatableMessages && (
                <button
                  onClick={toggleTranslation}
                  className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors border border-[#ebebeb] rounded-full px-3 py-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {translationDisabled ? "Activer la traduction" : "Désactiver la traduction"}
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-3">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-charcoal-400 text-sm">Chargement…</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-charcoal-400 text-sm">
                  Commencez la conversation !
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const msgLang = msg.language || "fr";
                  const myLang = currentUserLanguage || "fr";
                  const needsTranslation = !isMine && msgLang !== myLang;
                  const translated = translations[msg.id];
                  const showTranslation = needsTranslation && !translationDisabled && !!translated;
                  const isOriginalExpanded = expandedOriginals.has(msg.id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-white text-charcoal-800 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {showTranslation ? translated : msg.content}
                        </p>

                        {showTranslation && (
                          <>
                            <button
                              onClick={() => toggleOriginal(msg.id)}
                              className="flex items-center gap-1 text-xs text-charcoal-400 hover:text-charcoal-600 mt-2 transition-colors"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${isOriginalExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                              {isOriginalExpanded ? "Masquer l'original" : "Voir le message original"}
                            </button>
                            {isOriginalExpanded && (
                              <p className="whitespace-pre-wrap text-charcoal-500 text-xs mt-2 pt-2 border-t border-[#ebebeb]">
                                {msg.content}
                              </p>
                            )}
                          </>
                        )}

                        <div className="flex items-center justify-between mt-1 gap-3">
                          <p
                            className={`text-xs ${
                              isMine ? "text-white/50" : "text-charcoal-400"
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString("fr-CA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {showTranslation && (
                            <span className="text-xs text-charcoal-400">Traduit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-[#ebebeb] px-4 py-3 flex gap-3 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message… (Entrée pour envoyer)"
                rows={1}
                className="flex-1 border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                style={{ minHeight: "42px" }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {sending ? "…" : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
