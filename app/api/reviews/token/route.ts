import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { adminSupabase } from "@/lib/sendMessage";
import { getReviewRequestByToken } from "@/lib/reviewToken";
import { sendReviewReceivedEmail } from "@/lib/emails/reviewReceived";

const DAY_MS = 24 * 60 * 60 * 1000;

// Soumission d'un avis via le lien de courriel — jamais de session Supabase
// requise, le voyageur est identifié uniquement par le token de sa ligne
// review_requests (traveler_id). Gère les 2 types cumulables ('echange' et
// 'sejour'), chacun anti-rejeu par son propre état sur review_requests.
export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const body = await request.json().catch(() => ({}));
  const { token, reviewType, rating, comment } = body as {
    token?: string; reviewType?: "echange" | "sejour"; rating?: number; comment?: string;
  };

  if (!token || (reviewType !== "echange" && reviewType !== "sejour") || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: t2(locale, "Données invalides.", "Invalid data.") }, { status: 400 });
  }
  if (comment && comment.trim().length > 2000) {
    return NextResponse.json({ error: t2(locale, "Le commentaire ne peut pas dépasser 2000 caractères.", "The comment cannot exceed 2000 characters.") }, { status: 400 });
  }

  const admin = adminSupabase();
  const lookup = await getReviewRequestByToken(admin, token);
  if (!lookup.ok) {
    return NextResponse.json(
      { error: lookup.reason === "expired" ? t2(locale, "Ce lien a expiré.", "This link has expired.") : t2(locale, "Lien invalide.", "Invalid link.") },
      { status: lookup.reason === "expired" ? 410 : 404 }
    );
  }
  const reviewRequest = lookup.reviewRequest;

  // Anti-rejeu — chaque type a son propre garde, indépendant de l'autre.
  if (reviewType === "echange" && reviewRequest.echange_submitted_at) {
    return NextResponse.json({ error: t2(locale, "Vous avez déjà soumis cet avis.", "You have already submitted this review.") }, { status: 409 });
  }
  if (reviewType === "sejour") {
    if (reviewRequest.status === "completed") {
      return NextResponse.json({ error: t2(locale, "Vous avez déjà soumis cet avis.", "You have already submitted this review.") }, { status: 409 });
    }
    if (reviewRequest.status !== "awaiting_stay_review" && reviewRequest.status !== "stay_prompted") {
      return NextResponse.json({ error: t2(locale, "Cet avis n'est pas encore accessible.", "This review is not available yet.") }, { status: 400 });
    }
    // Garde défensive : même si l'état est correct, ne jamais accepter avant
    // que 24h se soient écoulées depuis le check_out (protège contre un lien
    // rejoué manuellement avant l'heure).
    if (reviewRequest.check_out) {
      const checkOutMs = new Date(`${reviewRequest.check_out}T00:00:00Z`).getTime();
      if (Date.now() - checkOutMs < DAY_MS) {
        return NextResponse.json({ error: t2(locale, "Cet avis n'est pas encore accessible.", "This review is not available yet.") }, { status: 400 });
      }
    }
  }

  const { data: review, error: insertError } = await admin
    .from("reviews")
    .insert({
      listing_id: reviewRequest.listing_id,
      author_id: reviewRequest.traveler_id,
      rating,
      comment: comment?.trim() || null,
      review_type: reviewType,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: t2(locale, "Vous avez déjà laissé cet avis pour ce chalet.", "You have already left this review for this cabin.") }, { status: 409 });
    }
    console.error("reviews/token: échec insertion avis", insertError);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la soumission.", "Error while submitting.") }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  if (reviewType === "echange") {
    await admin.from("review_requests").update({ echange_submitted_at: nowIso }).eq("id", reviewRequest.id);
  } else {
    await admin.from("review_requests").update({ status: "completed", completed_at: nowIso }).eq("id", reviewRequest.id);
  }

  // Notification au proprio — un échec ici ne doit jamais faire échouer la soumission.
  try {
    const [{ data: listing }, { data: traveler }] = await Promise.all([
      admin.from("listings").select("title, title_en, host_id").eq("id", reviewRequest.listing_id).single(),
      admin.from("users").select("name").eq("id", reviewRequest.traveler_id).single(),
    ]);
    if (listing?.host_id) {
      const { data: host } = await admin
        .from("users")
        .select("name, email, preferred_language")
        .eq("id", listing.host_id)
        .single();
      if (host?.email) {
        const hostLang: "fr" | "en" = host.preferred_language === "en" ? "en" : "fr";
        await sendReviewReceivedEmail({
          hostEmail: host.email,
          hostFirstName: host.name?.split(" ")[0],
          preferredLanguage: hostLang,
          listingTitle: (hostLang === "en" ? listing.title_en || listing.title : listing.title) || (hostLang === "en" ? "your cabin" : "votre chalet"),
          reviewerFirstName: (traveler?.name || (hostLang === "en" ? "A traveler" : "Un voyageur")).split(" ")[0],
          rating,
          comment: comment?.trim() || null,
        });
      }
    }
  } catch (emailErr) {
    console.error("[reviews/token] échec notification proprio", emailErr);
  }

  return NextResponse.json({ id: review.id }, { status: 201 });
}
