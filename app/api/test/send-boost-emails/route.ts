import { NextRequest, NextResponse } from "next/server";
import { sendFeaturedConfirmationEmail, sendFeaturedExpiringEmail, sendFeaturedExpiredEmail } from "@/lib/emails/featuredListing";

// Route de test TEMPORAIRE — envoie les 3 emails du cycle boost à une adresse fixe,
// avec des mois différents (futur/en cours/passé) pour valider visuellement le
// correctif du 2026-07-10 (voir CLAUDE.md). À retirer après validation.
const TEST_TOKEN = "e975513e1ab77c2cfaafe6890266c2d4";
const TEST_EMAIL = "info@chaletauthentik.com";
const TEST_LISTING_ID = "5b9fdf34-4181-4a05-93d3-c7404e996b1f"; // annonce réelle du compte test, pour un lien CTA fonctionnel

function monthKey(offsetFromNow: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetFromNow, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== TEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const common = {
    email: TEST_EMAIL,
    preferredLanguage: "fr" as const,
    firstName: "Simon",
    listingId: TEST_LISTING_ID,
    listingTitle: "Chalet du Lac Tremblant",
    type: "region" as const,
    region: "Laurentides",
  };

  const results: Record<string, string> = {};

  const confirmation = await sendFeaturedConfirmationEmail({ ...common, month: monthKey(2) });
  results.confirmation = confirmation.error ? `échec: ${confirmation.error.message}` : "envoyé";

  const expiring = await sendFeaturedExpiringEmail({ ...common, month: monthKey(0) });
  results.expiring = expiring.error ? `échec: ${expiring.error.message}` : "envoyé";

  const expired = await sendFeaturedExpiredEmail({ ...common, month: monthKey(-1) });
  results.expired = expired.error ? `échec: ${expired.error.message}` : "envoyé";

  return NextResponse.json({ ok: true, results });
}
