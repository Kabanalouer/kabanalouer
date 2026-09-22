import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate, toLang } from "@/lib/sendMessage";
import { buildQuoteMessage, type QuoteData } from "@/lib/quoteMessage";

// Devis structuré — le proprio n'entre que le prix total (taxes incluses).
// Le reste (dates/voyageurs de la demande initiale, prénom du voyageur) est
// assemblé automatiquement ici.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { listingId, receiverId, priceCents, sourceMessageId } = await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !sourceMessageId || !Number.isFinite(priceCents) || priceCents <= 0) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("host_id, title")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== user.id) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const [{ data: sender }, { data: receiver }, { data: sourceMessage }] = await Promise.all([
    admin.from("users").select("preferred_language").eq("id", user.id).single(),
    admin.from("users").select("name").eq("id", receiverId).single(),
    admin
      .from("messages")
      .select("check_in, check_out, num_guests, listing_id, sender_id, receiver_id")
      .eq("id", sourceMessageId)
      .maybeSingle(),
  ]);

  // Le message ciblé doit appartenir exactement à cette annonce, avoir été
  // envoyé par ce voyageur précis (receiverId) et reçu par ce proprio précis
  // (l'utilisateur connecté) — empêche un proprio de forger une requête pour
  // récupérer les dates/voyageurs d'un autre message que celui affiché.
  if (
    !sourceMessage ||
    sourceMessage.listing_id !== listingId ||
    sourceMessage.sender_id !== receiverId ||
    sourceMessage.receiver_id !== user.id
  ) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  const senderLang = toLang(sender?.preferred_language);
  const travelerFirstName = receiver?.name?.split(" ")[0] ?? null;
  const checkIn = (sourceMessage.check_in as string | null) ?? null;
  const checkOut = (sourceMessage.check_out as string | null) ?? null;
  const numGuests = (sourceMessage.num_guests as number | null) ?? null;

  const content = buildQuoteMessage(senderLang, {
    travelerFirstName,
    listingTitle: listing.title ?? "",
    checkIn,
    checkOut,
    numGuests,
    priceCents,
  });

  const quoteData: QuoteData = {
    checkIn, checkOut, numGuests, priceCents, travelerFirstName,
  };

  const result = await insertMessageAndTranslate(admin, {
    listingId,
    senderId: user.id,
    receiverId,
    content,
    quoteData,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
