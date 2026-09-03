import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/sendMessage";
import { getReviewRequestByToken } from "@/lib/reviewToken";
import { SITE_URL } from "@/lib/siteUrl";

const DAY_MS = 24 * 60 * 60 * 1000;

// Lien "J'ai réservé le chalet" du courriel initial — jamais de formulaire,
// juste un clic. Idempotent : un 2e clic ne re-déclenche rien, il redirige
// simplement selon l'état ACTUEL de la ligne (pas de rejeu de la transition).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  // Route API — jamais de préfixe /en dans son propre chemin (voir le
  // commentaire dans app/api/cron/review-requests/route.ts) ; la langue est
  // donc passée en query par le courriel, pour savoir vers quelle page
  // (préfixée ou non) rediriger.
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "fr";
  const prefix = lang === "en" ? "/en" : "";

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}${prefix}/avis/erreur`);
  }

  const admin = adminSupabase();
  const lookup = await getReviewRequestByToken(admin, token);
  if (!lookup.ok) {
    return NextResponse.redirect(`${SITE_URL}${prefix}/avis/erreur?raison=${lookup.reason}`);
  }
  const reviewRequest = lookup.reviewRequest;

  // Déjà au-delà de l'étape "réservé" — pas de rejeu, juste rediriger selon l'état actuel.
  if (reviewRequest.status === "stay_prompted" || reviewRequest.status === "completed") {
    return NextResponse.redirect(`${SITE_URL}${prefix}/avis/${token}/sejour`);
  }
  if (reviewRequest.status === "awaiting_stay_review") {
    return NextResponse.redirect(`${SITE_URL}${prefix}/avis/${token}/reserve/confirmation`);
  }

  // Premier clic (status === 'prompted') — détermine si le séjour est déjà
  // assez ancien pour aller direct au formulaire, ou s'il faut attendre.
  const checkOut = reviewRequest.check_out;
  const checkOutPassed = checkOut
    ? Date.now() - new Date(`${checkOut}T00:00:00Z`).getTime() >= DAY_MS
    : true; // pas de check_out connu — impossible de faire patienter, on laisse passer

  if (checkOutPassed) {
    await admin
      .from("review_requests")
      .update({ status: "stay_prompted", stay_prompted_at: new Date().toISOString() })
      .eq("id", reviewRequest.id);
    return NextResponse.redirect(`${SITE_URL}${prefix}/avis/${token}/sejour`);
  }

  await admin
    .from("review_requests")
    .update({ status: "awaiting_stay_review" })
    .eq("id", reviewRequest.id);
  return NextResponse.redirect(`${SITE_URL}${prefix}/avis/${token}/reserve/confirmation`);
}
