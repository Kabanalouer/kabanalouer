import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";
import type { QuoteData } from "@/lib/quoteMessage";

// Devis structuré — le proprio édite le texte complet côté client
// (QuoteWidget.tsx, gabarit + section de fermeture personnalisable) ; cette
// route ne fait que revalider le message source et enregistrer le résultat.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { listingId, receiverId, sourceMessageId, editedContent, saveAsTemplate, closingTemplateToSave } =
    await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !sourceMessageId || !editedContent?.trim()) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("host_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== user.id) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const [{ data: receiver }, { data: sourceMessage }] = await Promise.all([
    admin.from("users").select("name").eq("id", receiverId).single(),
    admin
      .from("messages")
      .select("check_in, check_out, num_guests, num_adults, num_children, num_babies, num_pets, listing_id, sender_id, receiver_id")
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

  const travelerFirstName = receiver?.name?.split(" ")[0] ?? null;

  const quoteData: QuoteData = {
    checkIn: (sourceMessage.check_in as string | null) ?? null,
    checkOut: (sourceMessage.check_out as string | null) ?? null,
    numGuests: (sourceMessage.num_guests as number | null) ?? null,
    numAdults: (sourceMessage.num_adults as number | null) ?? null,
    numChildren: (sourceMessage.num_children as number | null) ?? null,
    numBabies: (sourceMessage.num_babies as number | null) ?? null,
    numPets: (sourceMessage.num_pets as number | null) ?? null,
    // Plus de champ prix numérique séparé côté client (Correction 2) — le
    // prix fait partie du texte libre de `content`, conservé null ici.
    priceCents: null,
    travelerFirstName,
  };

  const result = await insertMessageAndTranslate(admin, {
    listingId,
    senderId: user.id,
    receiverId,
    content: editedContent.trim(),
    quoteData,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Sauvegarde du modèle de fermeture — best-effort, n'échoue jamais l'envoi
  // du devis si ça rate (même logique que la traduction automatique).
  if (saveAsTemplate && typeof closingTemplateToSave === "string" && closingTemplateToSave.trim()) {
    const { error: templateError } = await admin
      .from("users")
      .update({ quote_template_closing: closingTemplateToSave.trim() })
      .eq("id", user.id);
    if (templateError) {
      console.error("quote: échec sauvegarde du modèle de fermeture", templateError);
    }
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
