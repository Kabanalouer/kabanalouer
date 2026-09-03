import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/sendMessage";
import { generateReviewToken, computeTokenExpiresAt } from "@/lib/reviewToken";
import { sendReviewRequestEmail, sendStayReviewRequestEmail } from "@/lib/emails/reviewRequest";
import { SITE_URL } from "@/lib/siteUrl";

const DAY_MS = 24 * 60 * 60 * 1000;
const QUALIFYING_SILENCE_MS = 72 * 60 * 60 * 1000; // 72h sans nouveau message dans le fil

function reviewUrls(token: string, lang: "fr" | "en") {
  const prefix = lang === "en" ? "/en" : "";
  return {
    echangeUrl: `${SITE_URL}${prefix}/avis/${token}/echange`,
    // Route API — jamais de préfixe /en (les routes API n'ont pas d'équivalent
    // sous app/[locale]/, contrairement aux pages) ; la langue voyage en query.
    reserveUrl: `${SITE_URL}/api/reviews/token/reserve?token=${token}&lang=${lang}`,
    stayDirectUrl: `${SITE_URL}${prefix}/avis/${token}/sejour`,
  };
}

// Cron quotidien — 3 volets, voir CLAUDE.md item #8 :
// 1. Détecte les conversations qualifiées (proprio a répondu, silence > 72h,
//    pas déjà relancées) et envoie le courriel initial (choix échange/séjour).
// 2. Envoie le 2e courriel (avis de séjour) aux lignes en attente dont le
//    check_out + 24h est dépassé.
// 3. Marque 'expired' les lignes dont le token a dépassé sa date d'expiration
//    sans jamais avoir été complétées.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  let prompted = 0;
  let stayPrompted = 0;
  let expired = 0;

  // ── Phase 1 : nouvelles relances (courriel initial) ────────────────────
  // Scan complet de `messages` — volume encore modeste à ce stade (voir
  // exploration), et le regroupement par conversation a besoin de tout
  // l'historique (1er message pour check_out, dernier pour le silence de
  // 72h) — un filtre par date récente donnerait un résultat faux. On limite
  // quand même les colonnes sélectionnées, pas de SELECT *.
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("listing_id, sender_id, receiver_id, created_at, check_out")
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("[review-requests] échec lecture messages", msgError);
    return NextResponse.json({ error: "Erreur lors de la lecture des messages." }, { status: 500 });
  }

  const { data: listingsData, error: listingsError } = await supabase
    .from("listings")
    .select("id, host_id, title");

  if (listingsError) {
    console.error("[review-requests] échec lecture listings", listingsError);
    return NextResponse.json({ error: "Erreur lors de la lecture des annonces." }, { status: 500 });
  }

  const hostByListing = new Map((listingsData ?? []).map((l) => [l.id as string, l.host_id as string]));
  const titleByListing = new Map((listingsData ?? []).map((l) => [l.id as string, l.title as string]));

  type Conv = {
    listingId: string; hostId: string; travelerId: string;
    lastMessageAt: number; hostHasSent: boolean; checkOut: string | null;
  };
  const convByKey = new Map<string, Conv>();

  for (const msg of messages ?? []) {
    const listingId = msg.listing_id as string;
    const hostId = hostByListing.get(listingId);
    if (!hostId) continue; // annonce supprimée depuis
    const senderId = msg.sender_id as string;
    const receiverId = msg.receiver_id as string;
    const travelerId = senderId === hostId ? receiverId : senderId;
    if (travelerId === hostId) continue; // cas limite : le proprio s'écrit à lui-même

    const key = `${listingId}::${travelerId}::${hostId}`;
    const createdAtMs = new Date(msg.created_at as string).getTime();
    const existing = convByKey.get(key);

    if (!existing) {
      convByKey.set(key, {
        listingId, hostId, travelerId,
        lastMessageAt: createdAtMs,
        hostHasSent: senderId === hostId,
        checkOut: (msg.check_out as string | null) ?? null, // messages triés asc : 1er message du fil
      });
    } else {
      existing.lastMessageAt = createdAtMs; // triés asc : dernier passage = dernier message
      if (senderId === hostId) existing.hostHasSent = true;
      // checkOut jamais réécrit — reste celui du 1er message
    }
  }

  const { data: existingRequests } = await supabase
    .from("review_requests")
    .select("listing_id, traveler_id, host_id");

  const existingKeys = new Set(
    (existingRequests ?? []).map((r) => `${r.listing_id}::${r.traveler_id}::${r.host_id}`)
  );

  const now = Date.now();
  const qualifying = Array.from(convByKey.values()).filter((c) =>
    c.hostHasSent &&
    now - c.lastMessageAt > QUALIFYING_SILENCE_MS &&
    !existingKeys.has(`${c.listingId}::${c.travelerId}::${c.hostId}`)
  );

  if (qualifying.length > 0) {
    const travelerIds = [...new Set(qualifying.map((c) => c.travelerId))];
    const { data: travelers } = await supabase
      .from("users")
      .select("id, email, name, preferred_language")
      .in("id", travelerIds);
    const travelerById = new Map((travelers ?? []).map((u) => [u.id as string, u]));

    for (const conv of qualifying) {
      const traveler = travelerById.get(conv.travelerId);
      if (!traveler?.email) continue;

      const lang: "fr" | "en" = traveler.preferred_language === "en" ? "en" : "fr";
      const firstName = traveler.name?.trim().split(/\s+/)[0];
      const listingTitle = titleByListing.get(conv.listingId) || (lang === "en" ? "your listing" : "ce chalet");
      const token = generateReviewToken();
      const { echangeUrl, reserveUrl } = reviewUrls(token, lang);

      const { error: emailError } = await sendReviewRequestEmail({
        email: traveler.email, preferredLanguage: lang, firstName, listingTitle,
        echangeUrl, stayUrl: reserveUrl,
      });

      if (emailError) {
        console.error(`[review-requests] échec envoi courriel initial (listing ${conv.listingId}, traveler ${conv.travelerId})`, emailError);
        continue; // pas de ligne créée — le trio n'est pas encore dans review_requests, retenté demain
      }

      const { error: insertError } = await supabase.from("review_requests").insert({
        listing_id: conv.listingId,
        traveler_id: conv.travelerId,
        host_id: conv.hostId,
        status: "prompted",
        check_out: conv.checkOut,
        token,
        token_expires_at: computeTokenExpiresAt(conv.checkOut),
        prompted_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error(`[review-requests] échec création review_request (listing ${conv.listingId}, traveler ${conv.travelerId})`, insertError);
        continue;
      }
      prompted++;
    }
  }

  // ── Phase 2 : 2e courriel (check_out + 24h dépassé) ────────────────────
  // check_out est une DATE (sans heure) — "24h dépassé" est approximé par
  // "check_out est avant-hier ou plus ancien" (la journée du check_out
  // elle-même ne compte jamais comme dépassée).
  const cutoffDateStr = new Date(now - DAY_MS).toISOString().slice(0, 10);
  const { data: awaitingStay, error: awaitingError } = await supabase
    .from("review_requests")
    .select("id, listing_id, traveler_id, token")
    .eq("status", "awaiting_stay_review")
    .not("check_out", "is", null)
    .lte("check_out", cutoffDateStr);

  if (awaitingError) {
    console.error("[review-requests] échec lecture awaiting_stay_review", awaitingError);
  } else {
    for (const row of awaitingStay ?? []) {
      const { data: traveler } = await supabase
        .from("users")
        .select("email, name, preferred_language")
        .eq("id", row.traveler_id as string)
        .single();
      if (!traveler?.email) continue;

      const lang: "fr" | "en" = traveler.preferred_language === "en" ? "en" : "fr";
      const firstName = traveler.name?.trim().split(/\s+/)[0];
      const listingTitle = titleByListing.get(row.listing_id as string) || (lang === "en" ? "your listing" : "ce chalet");
      const { stayDirectUrl } = reviewUrls(row.token as string, lang);

      const { error: emailError } = await sendStayReviewRequestEmail({
        email: traveler.email, preferredLanguage: lang, firstName, listingTitle, stayUrl: stayDirectUrl,
      });

      if (emailError) {
        console.error(`[review-requests] échec envoi 2e courriel (review_request ${row.id})`, emailError);
        continue; // pas de flag posé — retenté demain
      }

      await supabase.from("review_requests")
        .update({ status: "stay_prompted", stay_prompted_at: new Date().toISOString() })
        .eq("id", row.id as string);
      stayPrompted++;
    }
  }

  // ── Phase 3 : expiration (délai raisonnable sans réponse) ──────────────
  const { data: expiredRows, error: expireSelectError } = await supabase
    .from("review_requests")
    .select("id")
    .not("status", "in", "(completed,expired)")
    .lt("token_expires_at", new Date().toISOString());

  if (expireSelectError) {
    console.error("[review-requests] échec lecture lignes à expirer", expireSelectError);
  } else if ((expiredRows ?? []).length > 0) {
    const { error: expireUpdateError } = await supabase
      .from("review_requests")
      .update({ status: "expired" })
      .in("id", (expiredRows ?? []).map((r) => r.id as string));

    if (expireUpdateError) {
      console.error("[review-requests] échec mise à jour lignes expirées", expireUpdateError);
    } else {
      expired = expiredRows?.length ?? 0;
    }
  }

  return NextResponse.json({ ok: true, prompted, stayPrompted, expired });
}
