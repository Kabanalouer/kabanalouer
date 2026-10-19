import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { PhotoItem } from "@/lib/photo";

export const maxDuration = 60;

// Nombre de fiches non revendiquées publiées par exécution (une exécution par jour).
const PUBLISH_PER_RUN = 15;

// GET — appelé par le cron Vercel (chaque jour) : publication progressive des fiches
// importées. Le script d'import les crée toutes NON publiées ; ce cron en met 15 en
// ligne par jour, les plus complètes d'abord (colonne score, calculée à l'import).
// Elles entrent d'elles-mêmes dans le sitemap (publiées = listées).
//
// Une fiche est publiable si : non revendiquée, ni de test ni retirée, CITQ à 6 chiffres
// et adresse de contact connus (la base l'exige aussi, voir listings_unclaimed_publish_check),
// un titre, au moins 5 photos et la vérification des filigranes faite (import_raw_data.photos_filigrane_verifiees). Rien d'autre n'est jamais publié par ce cron.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: candidates, error } = await admin
    .from("listings")
    .select("id, title, citq_number, claim_email, photos, score, created_at, import_raw_data")
    .eq("claim_status", "unclaimed")
    .eq("is_published", false)
    .eq("is_test", false)
    .not("claim_email", "is", null)
    .not("citq_number", "is", null)
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[cron publish-unclaimed]", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const ready = (candidates ?? [])
    .filter(
      (l) =>
        /^[0-9]{6}$/.test((l.citq_number as string) ?? "") &&
        ((l.title as string | null) ?? "").trim().length > 0 &&
        ((l.photos ?? []) as PhotoItem[]).length >= 5 &&
        // Jamais en ligne sans la vérification des filigranes (lib/importQueue.ts, cleanPhoto)
        (l.import_raw_data as { photos_filigrane_verifiees?: boolean } | null)?.photos_filigrane_verifiees === true
    )
    .slice(0, PUBLISH_PER_RUN);

  if (ready.length === 0) return NextResponse.json({ ok: true, published: 0, waiting: candidates?.length ?? 0 });

  const ids = ready.map((l) => l.id as string);
  const { error: updateError } = await admin
    .from("listings")
    .update({ is_published: true })
    .in("id", ids)
    .eq("claim_status", "unclaimed")
    .eq("is_published", false);
  if (updateError) {
    console.error("[cron publish-unclaimed] échec de publication", updateError.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, published: ids.length, waiting: Math.max(0, (candidates?.length ?? 0) - ids.length) });
}
