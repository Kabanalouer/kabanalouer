import { createClient as createAdminClient } from "@supabase/supabase-js";
import { translateText, type SupportedLanguage } from "@/lib/googleTranslate";

// Logique d'insertion + traduction automatique partagée entre les points
// d'envoi de message (/api/messages, /api/messages/quote) — centralisée ici
// pour éviter de dupliquer la traduction à chaque nouveau point d'envoi
// (voir CLAUDE.md : les 3 anciens points d'insertion directe côté client
// avaient déjà causé un oubli du même genre).

export function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function toLang(value: string | null | undefined): SupportedLanguage {
  return value === "en" ? "en" : "fr";
}

type AdminClient = ReturnType<typeof createAdminClient<any>>;

export async function insertMessageAndTranslate(
  admin: AdminClient,
  {
    listingId,
    senderId,
    receiverId,
    content,
    checkIn,
    checkOut,
    numGuests,
    quoteData,
  }: {
    listingId: string;
    senderId: string;
    receiverId: string;
    content: string;
    checkIn?: string | null;
    checkOut?: string | null;
    numGuests?: number | null;
    quoteData?: Record<string, unknown> | null;
  }
): Promise<{ id: string } | { error: string }> {
  const [{ data: sender }, { data: receiver }] = await Promise.all([
    admin.from("users").select("preferred_language").eq("id", senderId).single(),
    admin.from("users").select("preferred_language, translation_enabled").eq("id", receiverId).single(),
  ]);

  const senderLang = toLang(sender?.preferred_language);
  const receiverLang = toLang(receiver?.preferred_language);

  const insertPayload: Record<string, unknown> = {
    listing_id: listingId,
    sender_id: senderId,
    receiver_id: receiverId,
    content: content.trim(),
    language: senderLang,
  };
  if (checkIn !== undefined) insertPayload.check_in = checkIn;
  if (checkOut !== undefined) insertPayload.check_out = checkOut;
  if (numGuests !== undefined) insertPayload.num_guests = numGuests;
  if (quoteData !== undefined) insertPayload.quote_data = quoteData;

  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !message) {
    console.error("sendMessage: échec insertion", insertError);
    return { error: "Échec de l'envoi" };
  }

  // Traduction automatique — en arrière-plan après l'insertion, via update
  // (propagé au destinataire par Realtime, déjà branché sur cette table).
  // Un échec ici ne doit jamais faire échouer l'envoi du message.
  try {
    if (receiver?.translation_enabled !== false && senderLang !== receiverLang) {
      const translated = await translateText(content.trim(), senderLang, receiverLang);
      if (translated) {
        await admin
          .from("messages")
          .update({ content_translated: translated, translated_language: receiverLang })
          .eq("id", message.id as string);
      }
    }
  } catch (translateErr) {
    console.error("sendMessage: échec traduction automatique", translateErr);
  }

  return { id: message.id as string };
}
