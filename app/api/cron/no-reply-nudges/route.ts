import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendNoReplyNudgeEmail, type NudgeSuggestion } from "@/lib/emails/noReplyNudge";
import { buildListingPath } from "@/lib/listingUrl";
import { getRegionByDbValue } from "@/lib/regions";
import { slugify } from "@/lib/slugify";
import { firstPhotoUrl } from "@/lib/photo";

// Cron horaire — relance « le proprio n'a pas encore répondu » : quand le
// premier message d'un voyageur à un proprio date de 48 à 72 h et que le
// proprio n'a encore rien écrit dans la conversation, le voyageur reçoit un
// courriel avec 3 chalets semblables (même ville, sinon même région ; jamais
// du même proprio ni déjà contactés). Une seule relance par conversation
// (table no_reply_nudges, supabase/add-no-reply-nudges.sql). Rien n'est
// envoyé s'il n'y a aucun chalet à proposer ou si le voyageur a coupé les
// courriels (notify_email = false).

const H = 60 * 60 * 1000;
const MIN_AGE = 48 * H;
const MAX_AGE = 72 * H;

type Admin = ReturnType<typeof adminSupabase>;

function adminSupabase() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const SUGGESTION_COLUMNS = "id, host_id, title, title_en, region, city, price_low, price_on_request, capacity, bedrooms, photos, listing_number, custom_slug";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const now = Date.now();

  // Table anti-doublon absente (script SQL pas encore exécuté) : on n'envoie
  // rien plutôt que de risquer une relance à chaque passage.
  const { error: tableError } = await supabase.from("no_reply_nudges").select("listing_id").limit(1);
  if (tableError) {
    console.error("[no-reply-nudges] table no_reply_nudges illisible", tableError);
    return NextResponse.json({ error: "Table no_reply_nudges manquante." }, { status: 500 });
  }

  const { data: recent, error: recentError } = await supabase
    .from("messages")
    .select("listing_id, sender_id, receiver_id")
    .gte("created_at", new Date(now - MAX_AGE).toISOString())
    .lte("created_at", new Date(now - MIN_AGE).toISOString());
  if (recentError) {
    console.error("[no-reply-nudges] lecture messages", recentError);
    return NextResponse.json({ error: "Erreur de lecture." }, { status: 500 });
  }
  if (!recent?.length) return NextResponse.json({ sent: 0, skipped: 0 });

  const listingIds = [...new Set(recent.map((m) => m.listing_id as string))];
  const { data: listings } = await supabase
    .from("listings")
    .select("id, host_id, title, title_en, region, city")
    .in("id", listingIds);
  const listingById = new Map((listings ?? []).map((l) => [l.id as string, l]));

  // Conversations candidates : (annonce, voyageur), le voyageur étant
  // l'interlocuteur du proprio de l'annonce.
  const pairs = new Map<string, { listingId: string; travelerId: string; hostId: string }>();
  for (const m of recent) {
    const listing = listingById.get(m.listing_id as string);
    if (!listing) continue; // annonce supprimée
    const hostId = listing.host_id as string;
    const travelerId = m.sender_id === hostId ? (m.receiver_id as string) : (m.sender_id as string);
    if (!travelerId || travelerId === hostId) continue;
    pairs.set(`${listing.id}:${travelerId}`, { listingId: listing.id as string, travelerId, hostId });
  }

  let sent = 0;
  let skipped = 0;
  for (const pair of pairs.values()) {
    try {
      const outcome = await handlePair(supabase, pair, listingById.get(pair.listingId)!, now);
      if (outcome === "sent") sent++;
      else if (outcome === "skipped") skipped++;
    } catch (err) {
      console.error(`[no-reply-nudges] ${pair.listingId}/${pair.travelerId}`, err);
    }
  }

  return NextResponse.json({ sent, skipped });
}

async function handlePair(
  supabase: Admin,
  { listingId, travelerId, hostId }: { listingId: string; travelerId: string; hostId: string },
  listing: Record<string, unknown>,
  now: number,
): Promise<"sent" | "skipped" | "none"> {
  const { data: existing } = await supabase
    .from("no_reply_nudges")
    .select("status")
    .eq("listing_id", listingId)
    .eq("traveler_id", travelerId)
    .maybeSingle();
  if (existing) return "none";

  // Historique complet de la conversation : le proprio n'a jamais écrit, et
  // le tout premier message du voyageur a entre 48 et 72 h.
  const { data: history } = await supabase
    .from("messages")
    .select("sender_id, created_at")
    .eq("listing_id", listingId)
    .or(`and(sender_id.eq.${travelerId},receiver_id.eq.${hostId}),and(sender_id.eq.${hostId},receiver_id.eq.${travelerId})`)
    .order("created_at", { ascending: true });
  if (!history?.length) return "none";
  if (history.some((m) => m.sender_id === hostId)) return "none";
  const firstAge = now - new Date(history[0].created_at as string).getTime();
  if (firstAge < MIN_AGE || firstAge > MAX_AGE) return "none";

  const [{ data: traveler }, { data: host }] = await Promise.all([
    supabase.from("users").select("email, name, preferred_language, notify_email").eq("id", travelerId).maybeSingle(),
    supabase.from("users").select("name").eq("id", hostId).maybeSingle(),
  ]);
  if (!traveler?.email) return "none";

  const lang: "fr" | "en" = traveler.preferred_language === "en" ? "en" : "fr";
  const markSkipped = async () => {
    await supabase.from("no_reply_nudges").insert({ listing_id: listingId, traveler_id: travelerId, status: "skipped" });
    return "skipped" as const;
  };
  if (traveler.notify_email === false) return markSkipped();

  const suggestions = await findSuggestions(supabase, listing, hostId, travelerId, lang);
  if (!suggestions) return markSkipped();

  // Réservation de la ligne avant l'envoi (deux passages simultanés ne
  // peuvent pas envoyer deux fois) ; retirée si l'envoi échoue, pour réessayer.
  const { error: claimError } = await supabase
    .from("no_reply_nudges")
    .insert({ listing_id: listingId, traveler_id: travelerId, status: "sent" });
  if (claimError) return "none";

  const prefix = lang === "en" ? "/en" : "";
  const title = ((lang === "en" && (listing.title_en as string | null)) || (listing.title as string | null)) ?? "";
  const { error } = await sendNoReplyNudgeEmail({
    email: traveler.email as string,
    preferredLanguage: lang,
    firstName: ((traveler.name as string | null) ?? "").split(" ")[0],
    hostFirstName: ((host?.name as string | null) ?? "").split(" ")[0] || (lang === "en" ? "The owner" : "Le proprio"),
    listingTitle: title,
    place: suggestions.place,
    placePath: suggestions.placePath,
    conversationPath: `${prefix}/messages?listing=${listingId}&with=${hostId}`,
    suggestions: suggestions.items,
  });
  if (error) {
    console.error(`[no-reply-nudges] envoi ${listingId}/${travelerId}`, error);
    await supabase.from("no_reply_nudges").delete().eq("listing_id", listingId).eq("traveler_id", travelerId);
    return "none";
  }
  return "sent";
}

// 3 chalets publiés de la même ville, sinon de la même région — jamais du
// même proprio ni déjà contactés par le voyageur. null s'il n'y en a aucun.
async function findSuggestions(
  supabase: Admin,
  listing: Record<string, unknown>,
  hostId: string,
  travelerId: string,
  lang: "fr" | "en",
): Promise<{ items: NudgeSuggestion[]; place: string; placePath: string } | null> {
  const region = listing.region as string | null;
  const regionConfig = region ? getRegionByDbValue(region) : undefined;
  if (!region || !regionConfig) return null;
  const city = listing.city as string | null;

  const { data: contacted } = await supabase.from("messages").select("listing_id").eq("sender_id", travelerId);
  const excluded = new Set((contacted ?? []).map((m) => m.listing_id as string));

  const pick = async (byCity: boolean) => {
    let q = supabase.from("listings").select(SUGGESTION_COLUMNS)
      .eq("is_published", true).eq("region", region).neq("host_id", hostId);
    if (byCity) q = q.eq("city", city);
    const { data } = await q.order("created_at", { ascending: false }).limit(20);
    return (data ?? []).filter((l) => !excluded.has(l.id as string)).slice(0, 3);
  };

  let rows = city ? await pick(true) : [];
  const byCity = rows.length > 0;
  if (!byCity) rows = await pick(false);
  if (rows.length === 0) return null;

  const items: NudgeSuggestion[] = [];
  for (const l of rows) {
    const path = buildListingPath(
      { region: l.region as string, city: l.city as string | null, listing_number: l.listing_number as number | null, custom_slug: l.custom_slug as string | null },
      lang,
    );
    if (!path) continue;
    items.push({
      title: ((lang === "en" && (l.title_en as string | null)) || (l.title as string | null)) ?? "",
      city: l.city as string | null,
      capacity: l.capacity as number | null,
      bedrooms: l.bedrooms as number | null,
      price: l.price_low as number | null,
      priceOnRequest: !!l.price_on_request,
      photoUrl: firstPhotoUrl(l.photos) ?? null,
      path,
    });
  }
  if (items.length === 0) return null;

  const regionPath = lang === "en" ? `/en/cabins/${regionConfig.slugEn}` : `/chalets/${regionConfig.slug}`;
  return byCity && city
    ? { items, place: lang === "en" ? `in ${city}` : `à ${city}`, placePath: `${regionPath}/${slugify(city)}` }
    : { items, place: lang === "en" ? `in ${regionConfig.nameEn}` : regionConfig.locative, placePath: regionPath };
}
