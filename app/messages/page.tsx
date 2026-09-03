import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import MessagesClient from "@/components/messages/MessagesClient";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("messages"), getLocale()]);
  const isEn = locale === "en";
  return {
    title: t("title"),
    alternates: {
      canonical: isEn ? "/en/messages" : "/messages",
      languages: { fr: "/messages", en: "/en/messages", "x-default": "/messages" },
    },
  };
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  const { data: profile } = await supabase
    .from("users")
    .select("role, preferred_language, translation_enabled")
    .eq("id", user.id)
    .single();

  const isHost = profile?.role === "host" || profile?.role === "admin";
  const currentUserLanguage = profile?.preferred_language || "fr";
  const translationEnabled = profile?.translation_enabled !== false;

  // Fetch all messages where the user is sender or receiver
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url), listing:listing_id(id, title, host_id)")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Group into conversations keyed by listing_id + other_user_id
  type RawMsg = {
    id: string;
    listing_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    check_in: string | null;
    check_out: string | null;
    num_guests: number | null;
    sender: { id: string; name: string; avatar_url: string | null };
    receiver: { id: string; name: string; avatar_url: string | null };
    listing: { id: string; title: string; host_id: string };
  };

  const messages = (rawMessages ?? []) as RawMsg[];

  const convMap = new Map<
    string,
    {
      other_user_id: string;
      other_user_name: string;
      other_user_avatar: string | null;
      listing_id: string;
      listing_title: string;
      listing_host_id: string | null;
      last_message: string;
      last_message_at: string;
      unread_count: number;
      has_quote_request: boolean;
    }
  >();

  // messages est trié du plus récent au plus ancien (created_at desc) — donc
  // pour chaque conversation, le dernier passage de cette boucle correspond
  // toujours au tout premier message du fil.
  for (const msg of messages) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    const other = msg.sender_id === user.id ? msg.receiver : msg.sender;
    const key = `${msg.listing_id}::${otherId}`;

    if (!convMap.has(key)) {
      convMap.set(key, {
        other_user_id: otherId,
        other_user_name: other?.name ?? "Inconnu",
        other_user_avatar: other?.avatar_url ?? null,
        listing_id: msg.listing_id,
        listing_title: msg.listing?.title ?? "",
        listing_host_id: msg.listing?.host_id ?? null,
        last_message: msg.content,
        last_message_at: msg.created_at,
        unread_count: 0,
        has_quote_request: false,
      });
    }

    const conv = convMap.get(key)!;

    // Count unread messages sent TO the current user
    if (msg.receiver_id === user.id && !msg.is_read) {
      conv.unread_count++;
    }

    // Écrasé à chaque itération : comme on parcourt du plus récent au plus
    // ancien, la dernière écriture (donc le message le plus ancien) est celle
    // qui compte — le widget "Devis structuré" n'est offert que si CE
    // premier message vient du CTA principal "Demande de devis" (dates +
    // voyageurs), jamais du CTA secondaire "Contacter le propriétaire".
    conv.has_quote_request = !!(msg.check_in && msg.check_out && msg.num_guests);
  }

  const conversations = Array.from(convMap.values());

  return (
    <>
      <Navbar />
      <MessagesClient
        currentUserId={user.id}
        currentUserLanguage={currentUserLanguage}
        initialTranslationEnabled={translationEnabled}
        initialConversations={conversations}
      />
      {isHost && <DashboardBottomNav />}
    </>
  );
}
