import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { cleanDescription, truncateToLastSentence } from "@/lib/aiText";
import { detectImportPlatform, runApifyActor, ApifyImportError } from "@/lib/apify";
import { mapAirbnbItem, type ImportedListingData } from "@/lib/listingImportMapping";

// L'attente Apify seule peut prendre jusqu'à ~60s (voir lib/apify.ts) — laisse
// de la marge pour l'appel IA et les écritures qui suivent.
export const maxDuration = 90;

const AIRBNB_ACTOR = "tri_angle/airbnb-rooms-urls-scraper";
const APIFY_TIMEOUT_MS = 60000;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REWRITE_SYSTEM_PROMPT =
  "Tu es une experte en rédaction d'annonces de location touristique au Québec ET spécialiste en référencement (SEO). " +
  "On te donne les données brutes d'une annonce importée depuis Airbnb — ta tâche est d'écrire une description " +
  "originale pour Kabanalouer, pas de recopier le texte source. " +
  "Mets en valeur tous les équipements distinctifs mentionnés (piscine, spa, cuisine extérieure, table de billard, foyer, etc.). " +
  "Intègre naturellement le nom du chalet, la ville et la région dans le texte, pour le référencement. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et professionnel. Pas d'emojis. Sentence case. " +
  "N'utilise jamais le mot \"hôte\" — dis \"propriétaire\". Ne tutoie jamais le voyageur, utilise \"vous\". " +
  "La description est utilisée comme meta description sur Google — les 160 premiers caractères doivent contenir " +
  "les mots-clés principaux (type de chalet, région, équipements phares) de façon naturelle.";

function buildRewriteUserMessage(data: ImportedListingData): string {
  const lines = [
    data.title ? `Titre original : ${data.title}` : null,
    data.region ? `Région : ${data.region}` : null,
    data.city ? `Ville : ${data.city}` : null,
    data.capacity ? `Capacité : ${data.capacity} personnes` : null,
    data.bedrooms ? `Chambres : ${data.bedrooms}` : null,
    data.bathrooms ? `Salles de bain : ${data.bathrooms}` : null,
    data.amenities.length > 0 ? `Équipements reconnus : ${data.amenities.join(", ")}` : null,
    data.rawAmenities.length > 0 ? `Autres équipements mentionnés : ${data.rawAmenities.join(", ")}` : null,
    data.priceLow ? `Prix : à partir de ${data.priceLow} $/nuit` : null,
    data.description ? `Description originale (source, ne pas copier) :\n${data.description}` : null,
  ].filter(Boolean);

  return (
    "Génère une description complète pour cette annonce de chalet importée. Retourne UNIQUEMENT le texte de la " +
    "description, sans titre, sans en-tête, sans label, sans section, sans markdown, sans astérisques, sans dièse (#). " +
    "Commence directement par la première phrase. CONTRAINTE ABSOLUE : la description doit faire STRICTEMENT moins de " +
    "2500 caractères, espaces compris. Arrête-toi à une phrase complète avant la limite. Commence par une phrase " +
    "d'accroche forte.\n\nContexte :\n" + lines.join("\n")
  );
}

async function rewriteDescription(data: ImportedListingData): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: REWRITE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildRewriteUserMessage(data) }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return null;
    return truncateToLastSentence(cleanDescription(raw), 2500);
  } catch (err) {
    console.error("listings/import: échec réécriture IA", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { url, photosRightsConfirmed } = await request.json().catch(() => ({}));

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Lien d'annonce requis" }, { status: 400 });
  }
  if (photosRightsConfirmed !== true) {
    return NextResponse.json(
      { error: "Vous devez confirmer détenir les droits sur les photos avant d'importer une annonce" },
      { status: 400 }
    );
  }

  const platform = detectImportPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { error: "Lien non reconnu — seules les annonces Airbnb peuvent être importées pour l'instant" },
      { status: 400 }
    );
  }
  if (platform === "vrbo") {
    return NextResponse.json(
      { error: "L'import depuis VRBO n'est pas encore disponible, seul Airbnb est supporté pour l'instant." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "host" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux propriétaires" }, { status: 403 });
  }

  let items: unknown[];
  try {
    const checkIn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const checkOut = new Date(checkIn.getTime() + 2 * 24 * 60 * 60 * 1000);
    items = await runApifyActor(
      AIRBNB_ACTOR,
      {
        startUrls: [{ url }],
        locale: "fr-CA",
        currency: "CAD",
        checkIn: checkIn.toISOString().slice(0, 10),
        checkOut: checkOut.toISOString().slice(0, 10),
      },
      APIFY_TIMEOUT_MS
    );
  } catch (err) {
    const message = err instanceof ApifyImportError ? err.message : "Échec de l'extraction des données de l'annonce";
    console.error("listings/import: échec Apify", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const firstItem = items?.[0];
  if (!firstItem || typeof firstItem !== "object") {
    return NextResponse.json(
      { error: "Aucune donnée n'a pu être extraite de ce lien. Vérifiez qu'il s'agit bien d'une annonce publique." },
      { status: 502 }
    );
  }

  const mapped = mapAirbnbItem(firstItem as Record<string, unknown>);

  const admin = adminSupabase();

  const { data: listing, error: insertError } = await admin
    .from("listings")
    .insert({
      host_id: user.id,
      title: mapped.title,
      description: mapped.description,
      photos: mapped.photos,
      capacity: mapped.capacity ?? undefined,
      bedrooms: mapped.bedrooms ?? undefined,
      bathrooms: mapped.bathrooms ?? undefined,
      amenities: mapped.amenities,
      city: mapped.city,
      region: mapped.region,
      latitude: mapped.latitude,
      longitude: mapped.longitude,
      price_low: mapped.priceLow,
      is_published: false,
      import_source: platform,
      import_source_url: url,
      import_status: "pending_review",
      photos_rights_confirmed: true,
      import_raw_data: {
        rawAmenities: mapped.rawAmenities,
        rawRegionCandidate: mapped.rawRegionCandidate,
        scrapedItem: firstItem,
      },
    })
    .select("id")
    .single();

  if (insertError || !listing) {
    console.error("listings/import: échec insert listings", insertError);
    return NextResponse.json({ error: "Échec de la création de l'annonce importée" }, { status: 500 });
  }

  // Réécriture IA — ne doit jamais faire échouer l'import déjà réussi. Le
  // brouillon reste utilisable avec la description brute scrapée si ça rate.
  let aiRewriteApplied = false;
  if (await checkAiRateLimit(supabase, user.id, "listings-import")) {
    const rewritten = await rewriteDescription(mapped);
    if (rewritten) {
      const { error: updateError } = await admin
        .from("listings")
        .update({ description: rewritten })
        .eq("id", listing.id);
      if (updateError) {
        console.error("listings/import: échec update description IA", updateError);
      } else {
        aiRewriteApplied = true;
      }
    }
  }

  return NextResponse.json({ listingId: listing.id, aiRewriteApplied }, { status: 201 });
}
