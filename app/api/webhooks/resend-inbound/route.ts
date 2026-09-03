import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import EmailReplyParser from "email-reply-parser";
import { adminSupabase, insertMessageAndTranslate } from "@/lib/sendMessage";
import { extractEmailAddress, extractReplyToken, isAutoReply } from "@/lib/emailReplyAddress";

const resend = new Resend(process.env.RESEND_API_KEY!);
// Clé séparée, permission "Full access" — RESEND_API_KEY (utilisée partout
// ailleurs pour l'envoi) est en "Sending access" seulement et ne peut pas
// appeler l'API de réception (confirmé en test réel : 401
// "restricted_api_key"). Moindre privilège : seule cette route a besoin
// d'une clé plus large, jamais utilisée pour l'envoi.
const resendReceiving = new Resend(process.env.RESEND_RECEIVING_API_KEY!);

// Phase 2b — reçoit les réponses envoyées depuis la messagerie normale du
// destinataire (Gmail, Outlook, etc.) à conv-{token}@reply.kabanalouer.ca et
// les insère comme un message normal. Chaque cas d'exclusion (token
// inconnu, auto-réponse, expéditeur non reconnu, contenu vide) est ignoré
// silencieusement par choix d'architecture — jamais d'erreur visible côté
// expéditeur, seulement un log.
export async function POST(request: NextRequest) {
  // Corps brut requis pour la vérification de signature — jamais le JSON
  // parsé (la signature est sensible au moindre octet).
  const payload = await request.text();

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    });
  } catch (err) {
    console.error("[resend-inbound] signature invalide", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    // Le même endpoint pourrait un jour être abonné à d'autres événements —
    // on ignore tout ce qui n'est pas une réception.
    return NextResponse.json({ ok: true, ignored: "not_email_received" });
  }

  const { email_id, to, from: webhookFrom, subject: webhookSubject } = event.data;

  const token = extractReplyToken(to);
  if (!token) {
    console.log("[resend-inbound] aucune adresse conv-* reconnue dans 'to'", to);
    return NextResponse.json({ ok: true, ignored: "no_token" });
  }

  const admin = adminSupabase();

  const { data: replyAddress } = await admin
    .from("email_reply_addresses")
    .select("listing_id, user_a_id, user_b_id")
    .eq("token", token)
    .maybeSingle();

  if (!replyAddress) {
    console.log(`[resend-inbound] token inconnu: ${token}`);
    return NextResponse.json({ ok: true, ignored: "unknown_token" });
  }

  // Le webhook ne transporte que les métadonnées — le corps complet
  // (texte/HTML/en-têtes) nécessite cet appel supplémentaire.
  const { data: email, error: fetchError } = await resendReceiving.emails.receiving.get(email_id);
  if (fetchError || !email) {
    console.error("[resend-inbound] échec récupération du courriel complet", fetchError);
    return NextResponse.json({ error: "Échec de récupération du courriel" }, { status: 500 });
  }

  if (isAutoReply(email.headers, email.subject ?? webhookSubject)) {
    console.log(`[resend-inbound] réponse automatique ignorée (${email_id})`);
    return NextResponse.json({ ok: true, ignored: "auto_reply" });
  }

  const fromAddress = extractEmailAddress(email.from ?? webhookFrom);

  const { data: candidateUsers } = await admin
    .from("users")
    .select("id, email")
    .in("id", [replyAddress.user_a_id, replyAddress.user_b_id]);

  const senderUser = candidateUsers?.find(
    (u: { id: string; email: string | null }) => u.email?.toLowerCase() === fromAddress
  );
  if (!senderUser) {
    // Protection anti-abus décidée pour cette phase : seule une correspondance
    // exacte avec l'un des deux participants légitimes est acceptée.
    console.log(`[resend-inbound] adresse "from" ne correspond à aucun des 2 participants (${fromAddress})`);
    return NextResponse.json({ ok: true, ignored: "sender_mismatch" });
  }
  const receiverId =
    senderUser.id === replyAddress.user_a_id ? replyAddress.user_b_id : replyAddress.user_a_id;

  const visibleText = new EmailReplyParser().read(email.text ?? "").getVisibleText().trim();
  if (!visibleText) {
    console.log(`[resend-inbound] contenu visible vide après nettoyage (${email_id})`);
    return NextResponse.json({ ok: true, ignored: "empty_after_parsing" });
  }

  // Pas de gestion de pièces jointes pour l'instant — ignorées si présentes
  // (voir architecture Phase 2b, point 5).
  const result = await insertMessageAndTranslate(admin, {
    listingId: replyAddress.listing_id as string,
    senderId: senderUser.id as string,
    receiverId: receiverId as string,
    content: visibleText,
  });

  if ("error" in result) {
    console.error("[resend-inbound] échec insertion message", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messageId: result.id });
}
