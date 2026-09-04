import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendImportPublishedEmail } from "@/lib/emails/importPublished";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: viewerProfile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (viewerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const admin = adminSupabase();

  const { data: listing } = await admin
    .from("listings")
    .select("id, title, host_id, import_status")
    .eq("id", id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }
  if (listing.import_status !== "pending_review") {
    return NextResponse.json(
      { error: "Cette annonce n'est pas en attente de révision" },
      { status: 400 }
    );
  }

  const { data: hostRow } = await admin
    .from("users")
    .select("email, name, preferred_language")
    .eq("id", listing.host_id)
    .single();

  if (!hostRow?.email) {
    return NextResponse.json({ error: "Propriétaire introuvable" }, { status: 500 });
  }

  // Éligibilité par ANNONCE, pas par proprio — voir /api/subscriptions/activate-free
  // pour le même raisonnement. Une ligne subscriptions déjà existante pour CETTE
  // annonce bloque une 2e création, peu importe l'état des autres annonces du proprio.
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("listing_id", id)
    .maybeSingle();

  const { error: publishError } = await admin
    .from("listings")
    .update({ is_published: true, import_status: "published" })
    .eq("id", id);

  if (publishError) {
    console.error("admin/listings/publish: échec update listings", publishError);
    return NextResponse.json({ error: "Échec de la publication" }, { status: 500 });
  }

  // Abonnement offre de lancement — seulement si CETTE annonce n'en a jamais
  // eu (voir le check existingSub ci-dessus). Si elle en a déjà eu un, on ne
  // crée rien ici — laissé à une révision manuelle du prix plutôt que de
  // contourner silencieusement cette règle.
  let subscriptionCreated = false;
  if (!existingSub) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error: subError } = await admin.from("subscriptions").upsert(
      {
        listing_id: id,
        user_id: listing.host_id,
        stripe_subscription_id: null,
        status: "active",
        expires_at: expiresAt.toISOString(),
        is_free_launch: true,
        price_tier: "free",
        price_cents: 0,
      },
      { onConflict: "listing_id" }
    );

    if (subError) {
      console.error("admin/listings/publish: échec upsert subscriptions", subError);
    } else {
      subscriptionCreated = true;
    }
  }

  // Courriel de bienvenue — ne doit jamais faire échouer la publication déjà
  // réussie.
  try {
    const lang: "fr" | "en" = hostRow.preferred_language === "en" ? "en" : "fr";
    const { error: emailError } = await sendImportPublishedEmail({
      email: hostRow.email,
      preferredLanguage: lang,
      firstName: hostRow.name?.trim().split(/\s+/)[0],
      listingId: id,
      listingTitle: listing.title || (lang === "en" ? "your listing" : "ton chalet"),
      isFreeLaunch: subscriptionCreated,
    });
    if (emailError) {
      console.error("admin/listings/publish: échec envoi courriel de bienvenue", emailError);
    }
  } catch (err) {
    console.error("admin/listings/publish: échec envoi courriel de bienvenue", err);
  }

  return NextResponse.json({ ok: true, subscriptionCreated });
}
