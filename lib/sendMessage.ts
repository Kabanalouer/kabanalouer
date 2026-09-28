import { createClient as createAdminClient } from "@supabase/supabase-js";
import { detectAndTranslate, type SupportedLanguage } from "@/lib/googleTranslate";

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
    numAdults,
    numChildren,
    numBabies,
    numPets,
    quoteData,
  }: {
    listingId: string;
    senderId: string;
    receiverId: string;
    content: string;
    checkIn?: string | null;
    checkOut?: string | null;
    numGuests?: number | null;
    numAdults?: number | null;
    numChildren?: number | null;
    numBabies?: number | null;
    numPets?: number | null;
    quoteData?: Record<string, unknown> | null;
  }
): Promise<{ message: Record<string, unknown> } | { error: string }> {
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
  if (numAdults !== undefined) insertPayload.num_adults = numAdults;
  if (numChildren !== undefined) insertPayload.num_children = numChildren;
  if (numBabies !== undefined) insertPayload.num_babies = numBabies;
  if (numPets !== undefined) insertPayload.num_pets = numPets;
  if (quoteData !== undefined) insertPayload.quote_data = quoteData;

  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !message) {
    console.error("sendMessage: échec insertion", insertError);
    return { error: "Échec de l'envoi" };
  }

  // Traduction automatique — en arrière-plan après l'insertion, via update
  // (propagé au destinataire par Realtime, déjà branché sur cette table).
  // Un échec ici ne doit jamais faire échouer l'envoi du message.
  // La langue réellement écrite est détectée (pas celle du profil) : un
  // anglophone qui écrit en français, ou deux utilisateurs de même langue de
  // profil dont l'un écrit dans l'autre langue, sont couverts.
  try {
    if (receiver?.translation_enabled !== false) {
      const detected = await detectAndTranslate(content.trim());
      if (detected && detected.lang !== receiverLang) {
        await admin
          .from("messages")
          .update({ language: detected.lang, content_translated: detected.translated, translated_language: receiverLang })
          .eq("id", message.id as string);
      } else if (detected && detected.lang !== senderLang) {
        await admin.from("messages").update({ language: detected.lang }).eq("id", message.id as string);
      }
    }
  } catch (translateErr) {
    console.error("sendMessage: échec traduction automatique", translateErr);
  }

  return { message };
}
