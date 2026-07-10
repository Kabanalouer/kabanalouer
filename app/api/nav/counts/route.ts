import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/nav/counts — messages non lus + avis sans réponse, pour les badges de navigation.
// Exécuté côté serveur volontairement : les mêmes requêtes Supabase en HEAD (count exact)
// envoyées directement depuis le navigateur retournent systématiquement une erreur 503
// (constaté en QA le 2026-07-10, reproductible à 100 %) — contrairement au serveur, où ce
// pattern fonctionne normalement partout ailleurs dans le code.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { count: unreadCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  const { data: listings } = await supabase
    .from("listings")
    .select("id")
    .eq("host_id", user.id);

  let unansweredReviewsCount = 0;
  if (listings && listings.length > 0) {
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("listing_id", listings.map((l) => l.id))
      .is("host_reply", null);
    unansweredReviewsCount = count ?? 0;
  }

  return NextResponse.json({
    unreadCount: unreadCount ?? 0,
    unansweredReviewsCount,
  });
}
