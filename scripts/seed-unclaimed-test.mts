// Compte système + fiches non revendiquées de TEST, pour essayer tout le parcours
// de revendication (voir supabase/add-unclaimed-listings.sql).
//
//   set -a; source .env.local; set +a
//   npx tsx scripts/seed-unclaimed-test.mts seed [courriel-du-proprio-test]
//   npx tsx scripts/seed-unclaimed-test.mts cleanup          # supprime les fiches de test
//   npx tsx scripts/seed-unclaimed-test.mts cleanup --all    # + le compte système
//
// ATTENTION : la base est partagée entre le développement et la production.
// Les fiches de test sont NON publiées, `is_test = true` (lisibles par leur lien
// seulement, noindex, jamais dans la recherche ni le sitemap). Le courriel du
// proprio de test reçoit de VRAIS courriels : utiliser une adresse à soi.
//
// Le compte système n'a aucun mot de passe utilisable (aléatoire, jeté, jamais
// affiché) et est bloqué : aucune session ne peut s'ouvrir avec.

import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { generateUniqueListingNumber } from "../lib/generateListingNumber";
import { buildListingPath } from "../lib/listingUrl";

const SYSTEM_EMAIL = "fiches@kabanalouer.ca";
const DEFAULT_CLAIM_EMAIL = "simon.authentik@gmail.com";
const TEST_SOURCE = "test-seed";
const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://kabanalouer.ca";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (source .env.local).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const TEST_LISTINGS = [
  {
    n: 1,
    title: "TEST - Pourvoirie du Lac Fantôme",
    title_en: "TEST - Phantom Lake Outfitter",
    description:
      "Fiche de test. Trois chalets au bord d'un lac privé, sentiers de randonnée et pêche sur place. Cette fiche sert à essayer le parcours de revendication et sera supprimée.",
    description_en:
      "Test listing. Three cabins on a private lake, hiking trails and on-site fishing. This listing is used to try the claim flow and will be deleted.",
    region: "Laurentides",
    city: "Mille-Isles",
    latitude: 45.76,
    longitude: -74.07,
    citq: "999991",
    capacity: 8,
    price_low: 220,
  },
  {
    n: 2,
    title: "TEST - Chalet des Bouleaux",
    title_en: "TEST - Birch Cabin",
    description:
      "Fiche de test, même propriétaire que la première pour vérifier qu'un seul lien couvre toutes les fiches. Sera supprimée.",
    description_en:
      "Test listing, same owner as the first one to check that a single link covers all listings. Will be deleted.",
    region: "Laurentides",
    city: "Saint-Sauveur",
    latitude: 45.9,
    longitude: -74.16,
    citq: "999992",
    capacity: 6,
    price_low: 180,
  },
];

async function ensureSystemUser(): Promise<string> {
  const { data: existing } = await admin.from("users").select("id").eq("is_system", true).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: SYSTEM_EMAIL,
    // Aléatoire, jamais affiché ni gardé. 67 caractères : Supabase refuse plus de 72 et
    // exige une minuscule, une majuscule et un chiffre.
    password: `${randomBytes(24).toString("hex")}Aa1${randomBytes(8).toString("hex")}`,
    email_confirm: true,
    ban_duration: "876000h",
    user_metadata: { name: "Kabanalouer", role: "traveler" },
  });
  if (error || !created.user) throw new Error(`Création du compte système : ${error?.message ?? "échec"}`);

  const id = created.user.id;
  // La ligne users est créée par le déclencheur handle_new_user.
  const { error: updateError } = await admin
    .from("users")
    .update({
      is_system: true,
      name: "Kabanalouer",
      role: "traveler",
      notify_email: false,
      notify_sms: false,
      welcome_email_sent: true,
      translation_enabled: false,
    })
    .eq("id", id);
  if (updateError) throw new Error(`Marquage du compte système : ${updateError.message}`);
  return id;
}

const PHOTO_NAMES = ["test-seed-1.webp", "test-seed-2.webp"];

// 2 images unies rangées sous <compte système>/<id de la fiche>/ (la règle des photos
// d'une fiche non revendiquée) : sert à vérifier leur déplacement après une revendication.
async function uploadTestPhotos(systemId: string, listingId: string) {
  const photos: { url: string; caption: string }[] = [];
  for (const [i, color] of [["1", "#636e40"], ["2", "#c2410c"]] as const) {
    const buffer = await sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).webp().toBuffer();
    const path = `${systemId}/${listingId}/test-seed-${i}.webp`;
    const { error } = await admin.storage.from("listing-photos").upload(path, buffer, { contentType: "image/webp", upsert: true });
    if (error) throw new Error(`Photo de test ${i} : ${error.message}`);
    photos.push({ url: admin.storage.from("listing-photos").getPublicUrl(path).data.publicUrl, caption: `Photo de test ${i}` });
  }
  const { error } = await admin.from("listings").update({ photos }).eq("id", listingId);
  if (error) throw new Error(`Photos de la fiche : ${error.message}`);
}

async function seed(claimEmail: string) {
  const systemId = await ensureSystemUser();
  console.log(`Compte système : ${systemId}`);

  for (const t of TEST_LISTINGS) {
    const sourceUrl = `https://example.com/${TEST_SOURCE}/${t.n}`;
    const { data: existing } = await admin
      .from("listings")
      .select("id, listing_number, region, city, custom_slug")
      .eq("import_source_url", sourceUrl)
      .maybeSingle();
    let row = existing;
    if (!row) {
      const listing_number = await generateUniqueListingNumber(admin);
      const { data, error } = await admin
        .from("listings")
        .insert({
          host_id: systemId,
          title: t.title,
          title_en: t.title_en,
          description: t.description,
          description_en: t.description_en,
          region: t.region,
          city: t.city,
          latitude: t.latitude,
          longitude: t.longitude,
          citq_number: t.citq,
          capacity: t.capacity,
          // Fiche 1 = comme une vraie fiche importée : presque tout est inconnu (null),
          // pour vérifier que la page n'affiche ni n'invente rien. Fiche 2 = quelques champs connus.
          price_low: t.n === 1 ? null : t.price_low,
          price_on_request: t.n === 1,
          bedrooms: t.n === 1 ? null : 3,
          bathrooms: t.n === 1 ? null : 2,
          checkin_time: t.n === 1 ? null : "16:00",
          checkout_time: t.n === 1 ? null : "11:00",
          checkin_type: null,
          dogs_allowed: t.n === 1 ? null : true,
          dogs_max: t.n === 1 ? null : 2,
          dogs_size_limit: t.n === 1 ? null : "all",
          dogs_fee_type: t.n === 1 ? null : "free",
          smoking_allowed: null,
          min_age: null,
          listing_number,
          is_published: false,
          is_test: true,
          claim_status: "unclaimed",
          claim_email: claimEmail,
          claim_language: "fr",
          import_source: TEST_SOURCE,
          import_source_url: sourceUrl,
        })
        .select("id, listing_number, region, city, custom_slug")
        .single();
      if (error || !data) throw new Error(`Fiche de test ${t.n} : ${error?.message ?? "échec"}`);
      row = data;
      if (t.n === 1) await uploadTestPhotos(systemId, data.id as string);
    }
    const path = buildListingPath(
      { region: row.region as string, city: row.city as string, listing_number: row.listing_number as number, custom_slug: row.custom_slug as string | null },
      "fr"
    );
    console.log(`Fiche ${t.n} : ${row.id}  ${path ? SITE + path : "(chemin indisponible)"}`);
  }
  console.log(`Proprio de test (claim_email) : ${claimEmail}`);
}

async function cleanup(all: boolean) {
  // Photos de test : dans le dossier de la fiche (avant revendication) et dans celui du
  // propriétaire (après le déplacement) — à retirer avant de supprimer les fiches.
  const { data: sys0 } = await admin.from("users").select("id").eq("is_system", true).maybeSingle();
  const { data: toDelete } = await admin.from("listings").select("id, host_id").eq("is_test", true).eq("import_source", TEST_SOURCE);
  const files = (toDelete ?? []).flatMap((l) => [
    ...PHOTO_NAMES.map((n) => `${l.host_id}/${n}`),
    ...(sys0 ? PHOTO_NAMES.map((n) => `${sys0.id}/${l.id}/${n}`) : []),
  ]);
  if (files.length > 0) await admin.storage.from("listing-photos").remove(files);

  const { data: deleted, error } = await admin
    .from("listings")
    .delete()
    .eq("is_test", true)
    .eq("import_source", TEST_SOURCE)
    .select("id");
  if (error) throw new Error(`Suppression des fiches de test : ${error.message}`);
  console.log(`${deleted?.length ?? 0} fiche(s) de test supprimée(s) (messages, jetons, abonnements liés en cascade).`);

  if (all) {
    const { data: sys } = await admin.from("users").select("id").eq("is_system", true).maybeSingle();
    if (sys) {
      const { count } = await admin.from("listings").select("id", { count: "exact", head: true }).eq("host_id", sys.id);
      if ((count ?? 0) > 0) {
        console.error(`Le compte système détient encore ${count} fiche(s) : non supprimé.`);
        process.exit(1);
      }
      const { error: delError } = await admin.auth.admin.deleteUser(sys.id as string);
      if (delError) throw new Error(`Suppression du compte système : ${delError.message}`);
      console.log("Compte système supprimé.");
    }
  }
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command === "seed") return seed((arg ?? DEFAULT_CLAIM_EMAIL).trim().toLowerCase());
  if (command === "cleanup") return cleanup(arg === "--all");
  console.error("Usage : seed [courriel] | cleanup [--all]");
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
