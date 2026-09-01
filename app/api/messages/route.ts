import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { translateText, type SupportedLanguage } from "@/lib/googleTranslate";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function toLang(value: string | null | undefined): SupportedLanguage {
  return value === "en" ? "en" : "fr";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { listingId, receiverId, content } = await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !content?.trim()) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = adminSupabase();

  const [{ data: sender }, { data: receiver }] = await Promise.all([
    admin.from("users").select("preferred_language").eq("id", user.id).single(),
    admin.from("users").select("preferred_language, translation_enabled").eq("id", receiverId).single(),
  ]);

  const senderLang = toLang(sender?.preferred_language);
  const receiverLang = toLang(receiver?.preferred_language);

  // sender_id vient de la session, jamais du corps de la requête.
  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert({
      listing_id: listingId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
      language: senderLang,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return NextResponse.json({ error: insertError?.message ?? "Échec de l'envoi" }, { status: 500 });
  }

  // Traduction automatique — en arrière-plan après l'insertion, via update
  // (propagé au destinataire par Realtime, déjà branché sur cette table).
  // Un échec ici ne doit jamais faire échouer l'envoi du message : le message
  // reste affiché normalement, juste sans traduction.
  try {
    if (receiver?.translation_enabled !== false && senderLang !== receiverLang) {
      const translated = await translateText(content.trim(), senderLang, receiverLang);
      if (translated) {
        await admin
          .from("messages")
          .update({ content_translated: translated, translated_language: receiverLang })
          .eq("id", message.id);
      }
    }
  } catch (translateErr) {
    console.error("api/messages: échec traduction automatique", translateErr);
  }

  return NextResponse.json({ id: message.id }, { status: 201 });
}
