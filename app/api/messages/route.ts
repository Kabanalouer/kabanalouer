import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  // checkIn/checkOut/numGuests(+répartition) : capturés uniquement sur la
  // demande de devis initiale (bouton "Demande de devis" sur la fiche du
  // chalet, via ContactForm.tsx) — permet de générer un devis structuré plus
  // tard sans reparser le texte du message. Absents pour un message libre normal.
  const { listingId, receiverId, content, checkIn, checkOut, numGuests, numAdults, numChildren, numBabies, numPets } =
    await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !content?.trim()) {
    return NextResponse.json({ error: t2(locale, "Paramètres manquants", "Missing parameters") }, { status: 400 });
  }

  const admin = adminSupabase();

  // sender_id vient de la session, jamais du corps de la requête.
  const result = await insertMessageAndTranslate(admin, {
    listingId,
    senderId: user.id,
    receiverId,
    content,
    checkIn: checkIn ?? undefined,
    checkOut: checkOut ?? undefined,
    numGuests: numGuests ?? undefined,
    numAdults: numAdults ?? undefined,
    numChildren: numChildren ?? undefined,
    numBabies: numBabies ?? undefined,
    numPets: numPets ?? undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: t2(locale, result.error, "Failed to send the message.") }, { status: 500 });
  }

  return NextResponse.json({ id: result.message.id }, { status: 201 });
}
