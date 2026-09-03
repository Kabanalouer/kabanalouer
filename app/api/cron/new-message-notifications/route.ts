import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/sendMessage";
import { sendNewMessageNotificationEmail } from "@/lib/emails/newMessageNotification";

const FIVE_MIN_MS = 5 * 60 * 1000;

type Group = {
  listingId: string;
  senderId: string;
  receiverId: string;
  messageIds: string[];
  latestContent: string;
};

// Cron aux 5 minutes — Phase 2a (voir CLAUDE.md) : notifie par courriel les
// messages non lus depuis au moins 5 minutes, un seul courriel par
// conversation (regroupée listing_id+sender_id+receiver_id, même triplet que
// app/messages/page.tsx et le cron review-requests).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const cutoff = new Date(Date.now() - FIVE_MIN_MS).toISOString();

  const { data: candidates, error } = await supabase
    .from("messages")
    .select("id, listing_id, sender_id, receiver_id, content, created_at")
    .eq("is_read", false)
    .is("notification_sent_at", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[new-message-notifications] échec lecture messages", error);
    return NextResponse.json({ error: "Erreur lors de la lecture des messages." }, { status: 500 });
  }

  const groups = new Map<string, Group>();
  for (const msg of candidates ?? []) {
    const key = `${msg.listing_id}::${msg.sender_id}::${msg.receiver_id}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        listingId: msg.listing_id as string,
        senderId: msg.sender_id as string,
        receiverId: msg.receiver_id as string,
        messageIds: [msg.id as string],
        latestContent: msg.content as string,
      });
    } else {
      existing.messageIds.push(msg.id as string);
      // candidates triés asc par created_at — le dernier passage est le plus récent
      existing.latestContent = msg.content as string;
    }
  }

  let sent = 0;
  let skippedAlreadyRead = 0;
  const nowIso = new Date().toISOString();

  for (const group of groups.values()) {
    // Re-vérifie que les messages sont TOUJOURS non lus au moment du
    // traitement — évite une fausse notification si le destinataire vient
    // de les lire entre la sélection initiale et maintenant.
    const { data: stillUnread, error: recheckError } = await supabase
      .from("messages")
      .select("id")
      .in("id", group.messageIds)
      .eq("is_read", false);

    if (recheckError) {
      console.error("[new-message-notifications] échec re-vérification is_read", recheckError);
      continue; // pas de flag posé — retenté au prochain passage
    }

    if (!stillUnread || stillUnread.length === 0) {
      // Lu entre-temps — pas de notification, mais on marque quand même tout
      // le groupe pour ne jamais le réévaluer indéfiniment.
      await supabase.from("messages").update({ notification_sent_at: nowIso }).in("id", group.messageIds);
      skippedAlreadyRead++;
      continue;
    }

    const [{ data: sender }, { data: receiver }, { data: listing }] = await Promise.all([
      supabase.from("users").select("name").eq("id", group.senderId).single(),
      supabase.from("users").select("email, name, preferred_language").eq("id", group.receiverId).single(),
      supabase.from("listings").select("title").eq("id", group.listingId).single(),
    ]);

    if (!receiver?.email) continue;

    const lang: "fr" | "en" = receiver.preferred_language === "en" ? "en" : "fr";
    const senderFirstName = (sender?.name?.trim() || "Un utilisateur").split(/\s+/)[0];
    const listingTitle = listing?.title || (lang === "en" ? "your listing" : "ce chalet");

    const { error: emailError } = await sendNewMessageNotificationEmail(supabase, {
      email: receiver.email,
      preferredLanguage: lang,
      recipientFirstName: receiver.name?.split(" ")[0],
      recipientId: group.receiverId,
      senderFirstName,
      listingTitle,
      messageCount: stillUnread.length,
      previewText: group.latestContent,
      listingId: group.listingId,
      otherUserId: group.senderId,
    });

    if (emailError) {
      console.error(`[new-message-notifications] échec envoi (listing ${group.listingId}, receiver ${group.receiverId})`, emailError);
      continue; // pas de flag posé — retenté au prochain passage
    }

    await supabase.from("messages").update({ notification_sent_at: nowIso }).in("id", group.messageIds);
    sent++;
  }

  return NextResponse.json({ ok: true, groups: groups.size, sent, skippedAlreadyRead });
}
