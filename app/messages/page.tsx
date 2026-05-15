import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagesClient from "@/components/messages/MessagesClient";

export const metadata = { title: "Messages — Kabanalouer" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/messages");

  // Fetch all messages where the user is sender or receiver
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("*, sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url), listing:listing_id(id, title)")
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
    sender: { id: string; name: string; avatar_url: string | null };
    receiver: { id: string; name: string; avatar_url: string | null };
    listing: { id: string; title: string };
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
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }
  >();

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
        last_message: msg.content,
        last_message_at: msg.created_at,
        unread_count: 0,
      });
    }

    // Count unread messages sent TO the current user
    if (msg.receiver_id === user.id && !msg.is_read) {
      const conv = convMap.get(key)!;
      conv.unread_count++;
    }
  }

  const conversations = Array.from(convMap.values());

  return (
    <MessagesClient
      currentUserId={user.id}
      initialConversations={conversations}
    />
  );
}
