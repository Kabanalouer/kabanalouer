import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT = 5000;
// Un voyageur qui contacte plusieurs chalets reste loin de ces seuils
const MAX_PER_HOUR = 30;
const MAX_NEW_CONTACTS_PER_DAY = 15;

// Au moins un message déjà échangé entre ces deux personnes sur cette annonce
async function hasThread(admin: ReturnType<typeof adminSupabase>, listingId: string, a: string, b: string): Promise<boolean> {
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .or(`and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`);
  return (count ?? 0) > 0;
}

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

  if (typeof content !== "string" || content.length > MAX_CONTENT || !UUID.test(String(listingId)) || !UUID.test(String(receiverId)) || receiverId === user.id) {
    return NextResponse.json({ error: t2(locale, "Message invalide", "Invalid message") }, { status: 400 });
  }

  const admin = adminSupabase();

  // Destinataire légitime seulement : le proprio de l'annonce (voyageur qui
  // écrit), ou un voyageur qui a déjà écrit au proprio au sujet de cette
  // annonce (proprio qui répond). Sans ça, n'importe quel compte pouvait faire
  // envoyer courriels, textos et notifications à n'importe quel utilisateur.
  const { data: listing } = await admin.from("listings").select("host_id, is_published").eq("id", listingId).maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: t2(locale, "Annonce introuvable", "Listing not found") }, { status: 404 });
  }
  const hostId = listing.host_id as string;
  let allowed = false;
  if (receiverId === hostId) {
    allowed = listing.is_published === true || (await hasThread(admin, listingId, user.id, receiverId));
  } else if (user.id === hostId) {
    allowed = await hasThread(admin, listingId, user.id, receiverId);
  }
  if (!allowed) {
    return NextResponse.json({ error: t2(locale, "Destinataire invalide", "Invalid recipient") }, { status: 403 });
  }

  // Limites d'envoi par expéditeur
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: lastHour }, { data: recentReceivers }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id).gte("created_at", hourAgo),
    admin.from("messages").select("receiver_id").eq("sender_id", user.id).gte("created_at", dayAgo),
  ]);
  const distinctReceivers = new Set((recentReceivers ?? []).map((m) => m.receiver_id as string));
  if ((lastHour ?? 0) >= MAX_PER_HOUR || (!distinctReceivers.has(receiverId) && distinctReceivers.size >= MAX_NEW_CONTACTS_PER_DAY)) {
    return NextResponse.json(
      { error: t2(locale, "Trop de messages envoyés. Réessayez plus tard.", "Too many messages sent. Please try again later.") },
      { status: 429 }
    );
  }

  const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 50 ? v : undefined);
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

  // sender_id vient de la session, jamais du corps de la requête.
  const result = await insertMessageAndTranslate(admin, {
    listingId,
    senderId: user.id,
    receiverId,
    content,
    checkIn: date(checkIn),
    checkOut: date(checkOut),
    numGuests: num(numGuests),
    numAdults: num(numAdults),
    numChildren: num(numChildren),
    numBabies: num(numBabies),
    numPets: num(numPets),
  });

  if ("error" in result) {
    return NextResponse.json({ error: t2(locale, result.error, "Failed to send the message.") }, { status: 500 });
  }

  return NextResponse.json({ id: result.message.id }, { status: 201 });
}
