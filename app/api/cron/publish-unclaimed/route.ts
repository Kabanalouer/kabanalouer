import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PhotoItem } from "@/lib/photo";
import { buildListingPath } from "@/lib/listingUrl";
import { SITE_URL } from "@/lib/siteUrl";
import { sendUnclaimedPublishedNotice } from "@/lib/emails/unclaimedPublished";
import { AUTO_INVITATIONS_ENABLED, emailsStillImporting, listInvitationCandidates, sendInvitation, withoutWaiting } from "@/lib/claims/invitations";

export const maxDuration = 120;

// Invitations envoyées par passage (limite d'envoi de Resend : une toutes les 650 ms).
const MAX_INVITES_PER_RUN = 30;
const INVITE_DELAY_MS = 650;

// Nombre maximal de fiches non revendiquées mises en ligne par jour (heure de Montréal).
const PUBLISH_PER_DAY = 15;
// Pas de publication avant cette heure (le lot du matin est encore en préparation).
const EARLIEST_HOUR = 6;
// Après cette heure, l'avis à Simon part même si des fiches sont encore dans la file.
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
// fiches importées au fur et à mesure. La tâche Claude du matin remplit
// listing_import_queue vers 5 h 30 ; le cron import-queue crée les fiches (non publiées) ;
// ce cron met en ligne chaque fiche prête au passage suivant (à partir de 6 h), au plus
// 15 par jour, les plus complètes d'abord (colonne score). La date de mise en ligne est
// notée dans import_raw_data.publie_le (date de Montréal) : elle sert au plafond quotidien.
// Avis à Simon : un seul courriel quand la file est vide (ou à 10 h au plus tard), avec
// toutes les fiches mises en ligne dans la journée ; import_raw_data.avis_envoye_le évite
// de les annoncer deux fois.
//
// Une fiche est publiable si : non revendiquée, ni de test ni retirée, CITQ à 6 chiffres
// et adresse de contact connus (la base l'exige aussi, voir listings_unclaimed_publish_check),
// un titre, une description, au moins 5 photos et la vérification des filigranes faite (import_raw_data.photos_filigrane_verifiees). Rien d'autre n'est jamais publié par ce cron.
//
// Invitations (règle de Simon, 2026-10-20) : le propriétaire reçoit son invitation dès que
// sa fiche est en ligne, sans heure fixe. À chaque passage, après la publication, on envoie
// l'invitation à toute adresse qui a une fiche non revendiquée publiée et pas encore
// d'invitation (même si la fiche a été publiée à la main). Mêmes règles et même clé unique
// que send-invitations et Admin → Invitations : jamais deux invitations par adresse.
// Plusieurs chalets, une seule invitation (règle de Simon, 2026-10-23) : avant 10 h, on
// attend que toutes les fiches de l'adresse soient importées et en ligne (emailsStillImporting).
// Les relances (3 jours après) restent dans send-invitations.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const publish = await publishToday(admin);
  if ("error" in publish) return NextResponse.json({ error: publish.error }, { status: 500 });

  let invites = { sent: 0, skipped: 0, errors: 0 };
  if (AUTO_INVITATIONS_ENABLED) invites = await sendNewInvitations(admin);

  const notice = await notifySimonIfDone(admin);

  return NextResponse.json({ ok: true, ...publish, invites, notice });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any, "public", "public", any, any>;

async function sendNewInvitations(admin: Admin) {
  const { hour } = montrealParts(new Date());
  const waiting = hour < DEADLINE_HOUR ? await emailsStillImporting(admin) : new Set<string>();
  const candidates = withoutWaiting(await listInvitationCandidates(admin, "invite"), waiting);
  const batch = candidates.slice(0, MAX_INVITES_PER_RUN);
  const out = { sent: 0, skipped: 0, errors: 0 };
  for (let i = 0; i < batch.length; i++) {
    const r = await sendInvitation(admin, batch[i], "invite");
    if (r === "sent") out.sent++;
    else if (r === "skipped") out.skipped++;
    else out.errors++;
    if (i < batch.length - 1) await new Promise((res) => setTimeout(res, INVITE_DELAY_MS));
  }
  return out;
}

async function publishToday(admin: Admin): Promise<{ error: string } | { published: number; waiting?: number; skipped?: string; pending?: number }> {
  const { date: today, hour } = montrealParts(new Date());
  if (hour < EARLIEST_HOUR) return { published: 0, skipped: "Trop tôt." };

  // Plafond quotidien : fiches déjà mises en ligne aujourd'hui par ce cron
  const { count: publishedToday, error: countError } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .not("claim_status", "is", null)
    .eq("import_raw_data->>publie_le", today);
  if (countError) {
    console.error("[cron publish-unclaimed]", countError.message);
    return { error: "Query failed" };
  }
  const remaining = PUBLISH_PER_DAY - (publishedToday ?? 0);
  if (remaining <= 0) return { published: 0, skipped: "Plafond du jour atteint." };

  const { data: candidates, error } = await admin
    .from("listings")
    .select("id, title, citq_number, claim_email, photos, score, created_at, import_raw_data, description, region, city, listing_number, custom_slug")
    .eq("claim_status", "unclaimed")
    .eq("is_published", false)
    .eq("is_test", false)
    // Un brouillon n'est JAMAIS publié par le serveur (le propriétaire l'active lui-même)
    .is("mode_publication", null)
    .not("claim_email", "is", null)
    .not("citq_number", "is", null)
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[cron publish-unclaimed]", error.message);
    return { error: "Query failed" };
  }

  const ready = (candidates ?? [])
    .filter(
      (l) =>
        /^[0-9]{6}$/.test((l.citq_number as string) ?? "") &&
        ((l.title as string | null) ?? "").trim().length > 0 &&
        /[.!?…»)]$/.test(((l.description as string | null) ?? "").trim()) && ((l.description as string | null) ?? "").trim().length >= 40 && // jamais en ligne sans description complète (finit par une fin de phrase)
        ((l.photos ?? []) as PhotoItem[]).length >= 5 &&
        // Jamais en ligne sans la vérification des filigranes (lib/importQueue.ts, cleanPhoto)
        (l.import_raw_data as { photos_filigrane_verifiees?: boolean } | null)?.photos_filigrane_verifiees === true
    )
    .slice(0, remaining);

  if (ready.length === 0) return { published: 0, waiting: candidates?.length ?? 0 };

  // Une mise à jour par fiche : on ajoute publie_le à import_raw_data sans écraser le reste
  let published = 0;
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
    if (updated && updated.length > 0) published++;
  }

  return { published, waiting: Math.max(0, (candidates?.length ?? 0) - published) };
}

// Un seul avis par jour à Simon : quand la file d'import est vide (ou à 10 h au plus tard)
// et qu'au moins une fiche mise en ligne aujourd'hui n'a pas encore été annoncée.
async function notifySimonIfDone(admin: Admin): Promise<{ notified: number; skipped?: string }> {
  const { date: today, hour } = montrealParts(new Date());
  if (hour < EARLIEST_HOUR) return { notified: 0 };

  if (hour < DEADLINE_HOUR) {
    const { count: pending } = await admin
      .from("listing_import_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("attempts", 5);
    if ((pending ?? 0) > 0) return { notified: 0, skipped: "Import en cours." };
  }

  const { data: todays, error } = await admin
    .from("listings")
    .select("id, title, region, city, listing_number, custom_slug, import_raw_data, is_published")
    .not("claim_status", "is", null)
    .eq("is_published", true)
    .eq("import_raw_data->>publie_le", today)
    .order("region", { ascending: true });
  if (error || !todays || todays.length === 0) return { notified: 0 };

  const unannounced = todays.filter((l) => !(l.import_raw_data as { avis_envoye_le?: string } | null)?.avis_envoye_le);
  if (unannounced.length === 0) return { notified: 0 };

  const { count: waiting } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("claim_status", "unclaimed")
    .eq("is_published", false)
    .eq("is_test", false)
    .is("mode_publication", null);

  const { error: mailError } = await sendUnclaimedPublishedNotice({
    waiting: waiting ?? 0,
    items: todays.map((l) => {
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
  if (mailError) {
    console.error("[cron publish-unclaimed] avis non envoyé", mailError.message);
    return { notified: 0, skipped: "Échec de l'envoi." };
  }

  for (const l of unannounced) {
    const raw = (l.import_raw_data as Record<string, unknown> | null) ?? {};
    await admin.from("listings").update({ import_raw_data: { ...raw, avis_envoye_le: today } }).eq("id", l.id as string);
  }
  return { notified: todays.length };
}
