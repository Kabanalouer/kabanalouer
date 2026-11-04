import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { activateClaimedDrafts } from "@/lib/claims/activateDrafts";
import { markPublished } from "@/lib/publishedAt";

// Mise en ligne d'une annonce par son propriétaire : toujours gratuite, aucun paiement ni abonnement.
// Un brouillon revendiqué passe par les mêmes contrôles que le bouton « Activer » de Mes chalets.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = getRequestLocale(req);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { data: ownedListing } = await supabase
    .from("listings")
    .select("id, import_status, region")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!ownedListing) {
    return NextResponse.json({ error: t2(locale, "Annonce introuvable", "Listing not found") }, { status: 404 });
  }

  // Jamais d'annonce en ligne sans région : elle n'apparaîtrait sur aucune page région ni dans le fil d'Ariane.
  if (!(ownedListing.region as string | null)?.trim()) {
    return NextResponse.json({ error: t2(locale, "Choisissez la région de votre chalet (section Localisation) avant de publier.", "Choose your cabin's region (Location section) before publishing.") }, { status: 400 });
  }

  const admin = adminSupabase();
  const { data: draft } = await admin.from("listings").select("mode_publication").eq("id", id).maybeSingle();
  if (draft?.mode_publication === "brouillon") {
    const [result] = await activateClaimedDrafts(admin, { userId: user.id, listingIds: [id] });
    if (!result?.ok) {
      return NextResponse.json({ error: t2(locale, "Complétez la fiche (titre, description, 5 photos, région) avant de l'activer.", "Complete the listing (title, description, 5 photos, region) before activating it.") }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("listings")
    .update({ is_published: true, unpublished_reason: null, unpublished_at: null, ...(ownedListing.import_status === "pending_review" ? { import_status: "published" } : {}) })
    .eq("id", id)
    .eq("host_id", user.id);

  if (error) {
    console.error("listings/[id]/publish: échec publication", error);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la publication", "Error while publishing") }, { status: 500 });
  }

  await markPublished(admin, [id]);
  await admin.from("users").update({ role: "host" }).eq("id", user.id);

  return NextResponse.json({ success: true });
}
