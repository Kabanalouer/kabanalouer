import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { cleanDescription, truncateToLastSentence } from "@/lib/aiText";
import {
  NO_GENERIC_ADJECTIVES_FR,
  NO_GENERIC_ADJECTIVES_EN,
  PRIORITIZE_DIFFERENTIATING_AMENITIES_FR,
  PRIORITIZE_DIFFERENTIATING_AMENITIES_EN,
  GENERIC_ADJECTIVE_WORDS_FR,
  GENERIC_ADJECTIVE_WORDS_EN,
  findGenericAdjectives,
} from "@/lib/aiWritingRules";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT_FR =
  "Tu es un expert en rédaction d'annonces de location de chalet au Québec. " +
  "Tu maîtrises les meilleures pratiques d'Airbnb et Chalets.com. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et authentique. Pas d'emojis. Sentence case. " +
  "La description est utilisée comme meta description sur Google. " +
  "Les 160 premiers caractères sont les plus importants pour le SEO — ils doivent contenir les mots-clés principaux (type de chalet, région, équipements phares) de façon naturelle. " +
  "La description complète doit aussi être optimisée pour apparaître dans les recherches des LLM et agents IA qui cherchent des chalets au Québec. " +
  "STRUCTURE OBLIGATOIRE : rédige toujours la description dans cet ordre — (1) une accroche qui capte l'attention dès la première phrase, (2) les équipements clés en priorisant ceux qui différencient ce chalet, (3) l'aménagement et les chambres, (4) l'environnement et l'ambiance, (5) les activités et attraits à proximité. Enchaîne ces blocs en prose fluide, sans titres de section ni puces. " +
  "RÈGLE ANTI-RÉPÉTITION : ne répète jamais le même fait (capacité, nombre de chambres, nombre de salles de bain, un équipement nommé) une seconde fois ailleurs dans le texte — chaque fait n'apparaît qu'une seule fois, dans le bloc le plus pertinent. " +
  "AÉRATION : découpe le texte en 2 à 3 paragraphes séparés par un saut de ligne double, pour la lisibilité sur mobile — les paragraphes n'ont pas besoin de correspondre chacun à un bloc précis, ce sont simplement des pauses visuelles naturelles dans le texte. " +
  NO_GENERIC_ADJECTIVES_FR + " " +
  PRIORITIZE_DIFFERENTIATING_AMENITIES_FR;

const SYSTEM_PROMPT_EN =
  "You are an expert in writing vacation cabin rental listings in Quebec, Canada. " +
  "You follow best practices from Airbnb and Chalets.com. " +
  "You write in English with a warm, authentic tone. No emojis. Sentence case. " +
  "The description is used as a meta description on Google. " +
  "The first 160 characters are the most important for SEO — they must contain the main keywords (cabin type, region, key amenities) naturally. " +
  "The full description must also be optimized to appear in searches by LLMs and AI agents looking for cabins in Quebec. " +
  "MANDATORY STRUCTURE: always write the description in this order — (1) a hook that grabs attention from the first sentence, (2) key amenities, prioritizing the ones that differentiate this cabin, (3) layout and bedrooms, (4) setting and atmosphere, (5) nearby activities and attractions. Flow these blocks together as prose, with no section headings or bullet points. " +
  "NO-REPEAT RULE: never repeat the same fact (capacity, number of bedrooms, number of bathrooms, a named amenity) a second time anywhere else in the text — each fact appears only once, in the most relevant block. " +
  "READABILITY: break the text into 2 to 3 paragraphs separated by a double line break, for mobile readability — paragraphs don't need to map to a single specific block each, they're just natural visual pauses in the text. " +
  NO_GENERIC_ADJECTIVES_EN + " " +
  PRIORITIZE_DIFFERENTIATING_AMENITIES_EN;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "generate-description"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const {
    title,
    region,
    city,
    capacity,
    bedrooms,
    bathrooms,
    amenities,
    nearby_activities,
    price_low,
    price_on_request,
    locale,
  } = await request.json();

  const isEn = locale === "en";
  const SYSTEM_PROMPT = isEn ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;

  const lines = isEn
    ? [
        title ? `Title: ${title}` : null,
        region ? `Region: ${region}` : null,
        city ? `City: ${city}` : null,
        capacity ? `Capacity: ${capacity} people` : null,
        bedrooms ? `Bedrooms: ${bedrooms}` : null,
        bathrooms ? `Bathrooms: ${bathrooms}` : null,
        Array.isArray(amenities) && amenities.length > 0 ? `Amenities: ${amenities.join(", ")}` : null,
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Nearby activities: ${nearby_activities.join(", ")}`
          : null,
        price_on_request
          ? `Price: on request`
          : price_low
          ? `Price: from ${price_low} $/night`
          : null,
      ].filter(Boolean).join("\n")
    : [
        title ? `Titre : ${title}` : null,
        region ? `Région : ${region}` : null,
        city ? `Ville : ${city}` : null,
        capacity ? `Capacité : ${capacity} personnes` : null,
        bedrooms ? `Chambres : ${bedrooms}` : null,
        bathrooms ? `Salles de bain : ${bathrooms}` : null,
        Array.isArray(amenities) && amenities.length > 0 ? `Caractéristiques : ${amenities.join(", ")}` : null,
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Activités à proximité : ${nearby_activities.join(", ")}`
          : null,
        price_on_request
          ? `Prix : sur demande`
          : price_low
          ? `Prix : à partir de ${price_low} $/nuit`
          : null,
      ].filter(Boolean).join("\n");

  const userPrompt = isEn
    ? `${NO_GENERIC_ADJECTIVES_EN} Generate a complete description for this cabin listing. Return ONLY the description text, no title, no header, no label, no section, no markdown, no asterisks, no hash (#), no counting. Start directly with the first sentence. ABSOLUTE CONSTRAINT: the description must be STRICTLY less than 2500 characters including spaces. Stop at a complete sentence before the limit. Never cut a sentence mid-way. Start with a strong hook sentence. Describe the atmosphere, highlights, and nearby activities.\n\nContext:\n${lines}`
    : `${NO_GENERIC_ADJECTIVES_FR} Génère une description complète pour cette annonce de chalet. Retourne UNIQUEMENT le texte de la description, sans titre, sans en-tête, sans label, sans section, sans markdown, sans astérisques, sans dièse (#), sans comptage. Commence directement par la première phrase de la description. CONTRAINTE ABSOLUE : la description doit faire STRICTEMENT moins de 2500 caractères, espaces compris. Arrête-toi à une phrase complète avant la limite. Ne jamais couper une phrase en plein milieu. Commence par une phrase d'accroche forte. Décris l'ambiance, les points forts, les activités à proximité. Ne tutoie jamais le voyageur, utilise "vous".\n\nContexte :\n${lines}`;

  const genericWords = isEn ? GENERIC_ADJECTIVE_WORDS_EN : GENERIC_ADJECTIVE_WORDS_FR;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let cleaned = "";
    // Un seul essai supplémentaire si la liste noire n'est pas respectée —
    // jamais de boucle, on renvoie le résultat du 2e essai tel quel.
    for (let attempt = 0; attempt < 2; attempt++) {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
      if (!raw) continue;
      cleaned = cleanDescription(raw);
      const hits = findGenericAdjectives(cleaned, genericWords);
      if (hits.length === 0) break;
      console.warn("[generate-description] mot générique détecté, nouvel essai :", hits);
    }

    if (!cleaned) return NextResponse.json({ error: "Génération échouée." }, { status: 500 });
    return NextResponse.json({ description: truncateToLastSentence(cleaned, 2500) });
  } catch (err) {
    console.error("[generate-description]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
