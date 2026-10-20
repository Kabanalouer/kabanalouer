import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { PhotoItem } from "@/lib/photo";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { sendUnclaimedPublishedNotice } from "@/lib/emails/unclaimedPublished";

export const maxDuration = 60;

// Nombre maximal de fiches non revendiquées mises en ligne par jour (heure de Montréal).
const PUBLISH_PER_DAY = 15;
// Pas de publication avant cette heure (le lot du matin est encore en préparation).
const EARLIEST_HOUR = 6;
// Après cette heure, on publie ce qui est prêt même si des fiches sont encore dans la file.
const DEADLINE_HOUR = 10;

function montrealParts(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

// GET — appelé par le cron Vercel (toutes les 10 minutes, le matin) : publication des
// fiches importées dès que le lot du jour est prêt. La tâche Claude du matin remplit
// listing_import_queue vers 5 h 30 ; le cron import-queue crée les fiches (non publiées) ;
// ce cron les met en ligne d'un coup quand la file est vide (ou à 10 h au plus tard),
// au plus 15 par jour, les plus complètes d'abord (colonne score), puis avise Simon par
// courriel. La date de mise en ligne est notée dans import_raw_data.publie_le (date de
// Montréal) : c'est elle qui sert au plafond quotidien.
//
// Une fiche est publiable si : non revendiquée, ni de test ni retirée, CITQ à 6 chiffres
// et adresse de contact connus (la base l'exige aussi, voir listings_unclaimed_publish_check),
// un titre, une description, au moins 5 photos et la vérification des filigranes faite (import_raw_data.photos_filigrane_verifiees). Rien d'autre n'est jamais publié par ce cron.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date: today, hour } = montrealParts(new Date());
  if (hour < EARLIEST_HOUR) return NextResponse.json({ ok: true, skipped: "Trop tôt." });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Plafond quotidien : fiches déjà mises en ligne aujourd'hui par ce cron
  const { count: publishedToday, error: countError } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .not("claim_status", "is", null)
    .eq("import_raw_data->>publie_le", today);
  if (countError) {
    console.error("[cron publish-unclaimed]", countError.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  const remaining = PUBLISH_PER_DAY - (publishedToday ?? 0);
  if (remaining <= 0) return NextResponse.json({ ok: true, skipped: "Plafond du jour atteint." });

  // On attend la fin de l'import du lot du jour (une seule mise en ligne et un seul avis)
  if (hour < DEADLINE_HOUR) {
    const { count: pending } = await admin
      .from("listing_import_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("attempts", 5);
    if ((pending ?? 0) > 0) return NextResponse.json({ ok: true, skipped: "Import en cours.", pending });
  }

  const { data: candidates, error } = await admin
    .from("listings")
    .select("id, title, citq_number, claim_email, photos, score, created_at, import_raw_data, description, region, city, listing_number, custom_slug")
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
        ((l.description as string | null) ?? "").trim().length >= 40 && // jamais en ligne sans description
        ((l.photos ?? []) as PhotoItem[]).length >= 5 &&
        // Jamais en ligne sans la vérification des filigranes (lib/importQueue.ts, cleanPhoto)
        (l.import_raw_data as { photos_filigrane_verifiees?: boolean } | null)?.photos_filigrane_verifiees === true
    )
    .slice(0, remaining);

  if (ready.length === 0) return NextResponse.json({ ok: true, published: 0, waiting: candidates?.length ?? 0 });

  // Une mise à jour par fiche : on ajoute publie_le à import_raw_data sans écraser le reste
  const published: typeof ready = [];
  for (const l of ready) {
    const raw = (l.import_raw_data as Record<string, unknown> | null) ?? {};
    const { data: updated, error: updateError } = await admin
      .from("listings")
      .update({ is_published: true, import_raw_data: { ...raw, publie_le: today } })
      .eq("id", l.id as string)
      .eq("claim_status", "unclaimed")
      .eq("is_published", false)
      .select("id");
    if (updateError) {
      console.error("[cron publish-unclaimed] échec de publication", l.id, updateError.message);
      continue;
    }
    if (updated && updated.length > 0) published.push(l);
  }

  const waiting = Math.max(0, (candidates?.length ?? 0) - published.length);
  if (published.length > 0) {
    const { error: mailError } = await sendUnclaimedPublishedNotice({
      waiting,
      items: published.map((l) => {
        const path = buildListingPath(
          {
            region: (l.region as string | null) ?? null,
            city: (l.city as string | null) ?? null,
            listing_number: (l.listing_number as number | null) ?? null,
            custom_slug: (l.custom_slug as string | null) ?? null,
          },
          "fr"
        );
        return {
          title: (l.title as string) ?? "",
          city: (l.city as string | null) ?? null,
          region: (l.region as string | null) ?? null,
          url: path ? `${SITE_URL}${path}` : null,
        };
      }),
    });
    if (mailError) console.error("[cron publish-unclaimed] avis non envoyé", mailError.message);
  }

  return NextResponse.json({ ok: true, published: published.length, waiting });
}
