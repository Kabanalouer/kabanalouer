"use client";

import { useState, useEffect, useRef } from "react";
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
  initialConversations,
}: {
  currentUserId: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(
    (c) => c.listing_id === selectedListingId && c.other_user_id === selectedWithId
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
        setMessages((data as Message[]) ?? []);
        setLoadingMessages(false);
      });

    // Mark received messages as read
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("listing_id", selectedListingId)
      .eq("sender_id", selectedWithId)
      .eq("receiver_id", currentUserId)
      .eq("is_read", false)
      .then(() => {});
  }, [selectedListingId, selectedWithId]);

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

          if (data) setMessages((prev) => [...prev, data as Message]);

          if (msg.receiver_id === currentUserId) {
            await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedListingId, selectedWithId]);

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
    router.push(`/messages?listing=${conv.listing_id}&with=${conv.other_user_id}`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar: conversation list */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-lg">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
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
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    isActive ? "bg-primary-50 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {conv.other_user_avatar ? (
                        <Image
                          src={conv.other_user_avatar}
                          alt={conv.other_user_name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                          {conv.other_user_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {conv.other_user_name}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{conv.listing_title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main: thread view */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedListingId || !selectedWithId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="font-medium text-gray-500">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              {activeConv && (
                <>
                  <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {activeConv.other_user_avatar ? (
                      <Image
                        src={activeConv.other_user_avatar}
                        alt={activeConv.other_user_name}
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                        {activeConv.other_user_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{activeConv.other_user_name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{activeConv.listing_title}</p>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Chargement…</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  Commencez la conversation !
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isMine ? "text-primary-50/70" : "text-gray-400"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString("fr-CA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-3 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message… (Entrée pour envoyer)"
                rows={1}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                style={{ minHeight: "42px" }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex-shrink-0"
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
