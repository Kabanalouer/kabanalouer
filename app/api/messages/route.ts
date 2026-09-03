import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // checkIn/checkOut/numGuests : capturés uniquement sur la demande de devis
  // initiale (bouton "Demande de devis" sur la fiche du chalet, via
  // ContactForm.tsx) — permet de générer un devis structuré plus tard sans
  // reparser le texte du message. Absents pour un message libre normal.
  const { listingId, receiverId, content, checkIn, checkOut, numGuests } =
    await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !content?.trim()) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
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
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
