import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate, toLang } from "@/lib/sendMessage";
import { buildQuoteMessage, type QuoteData } from "@/lib/quoteMessage";

// Devis structuré — le proprio n'entre que le prix total (taxes incluses).
// Le reste (dates/voyageurs de la demande initiale, prénom du voyageur,
// section "Devis" de l'annonce) est assemblé automatiquement ici.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { listingId, receiverId, priceCents } = await request.json().catch(() => ({}));
  if (!listingId || !receiverId || !Number.isFinite(priceCents) || priceCents <= 0) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("host_id, title, quote_inclusions, quote_exclusions, quote_booking_instructions")
    .eq("id", listingId)
    .single();

  if (!listing || listing.host_id !== user.id) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const [{ data: sender }, { data: receiver }, { data: initialRequest }] = await Promise.all([
    admin.from("users").select("preferred_language").eq("id", user.id).single(),
    admin.from("users").select("name").eq("id", receiverId).single(),
    admin
      .from("messages")
      .select("check_in, check_out, num_guests")
      .eq("listing_id", listingId)
      .eq("sender_id", receiverId)
      .eq("receiver_id", user.id)
      .not("check_in", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const senderLang = toLang(sender?.preferred_language);
  const travelerFirstName = receiver?.name?.split(" ")[0] ?? null;
  const inclusions = Array.isArray(listing.quote_inclusions) ? (listing.quote_inclusions as string[]) : [];
  const exclusions = Array.isArray(listing.quote_exclusions) ? (listing.quote_exclusions as string[]) : [];
  const bookingInstructions = (listing.quote_booking_instructions as string | null) ?? null;
  const checkIn = (initialRequest?.check_in as string | null) ?? null;
  const checkOut = (initialRequest?.check_out as string | null) ?? null;
  const numGuests = (initialRequest?.num_guests as number | null) ?? null;

  const content = buildQuoteMessage(senderLang, {
    travelerFirstName,
    listingTitle: listing.title ?? "",
    checkIn,
    checkOut,
    numGuests,
    priceCents,
    inclusions,
    exclusions,
    bookingInstructions,
  });

  const quoteData: QuoteData = {
    checkIn, checkOut, numGuests, priceCents,
    inclusions, exclusions, bookingInstructions, travelerFirstName,
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
