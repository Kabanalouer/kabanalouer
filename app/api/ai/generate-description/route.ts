import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT_FR =
  "Tu es un expert en rédaction d'annonces de location de chalet au Québec. " +
  "Tu maîtrises les meilleures pratiques d'Airbnb et Chalets.com. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et authentique. Pas d'emojis. Sentence case. " +
  "La description est utilisée comme meta description sur Google. " +
  "Les 160 premiers caractères sont les plus importants pour le SEO — ils doivent contenir les mots-clés principaux (type de chalet, région, équipements phares) de façon naturelle. " +
  "La description complète doit aussi être optimisée pour apparaître dans les recherches des LLM et agents IA qui cherchent des chalets au Québec.";

const SYSTEM_PROMPT_EN =
  "You are an expert in writing vacation cabin rental listings in Quebec, Canada. " +
  "You follow best practices from Airbnb and Chalets.com. " +
  "You write in English with a warm, authentic tone. No emojis. Sentence case. " +
  "The description is used as a meta description on Google. " +
  "The first 160 characters are the most important for SEO — they must contain the main keywords (cabin type, region, key amenities) naturally. " +
  "The full description must also be optimized to appear in searches by LLMs and AI agents looking for cabins in Quebec.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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

function cleanDescription(text: string): string {
  const lines = text.split("\n");
  // Remove lines starting with # or ** (headers, bold labels)
  const filtered = lines.filter((line) => !line.trimStart().startsWith("#") && !line.trimStart().startsWith("**"));
  // Drop leading blank lines
  while (filtered.length > 0 && filtered[0].trim() === "") filtered.shift();
  return filtered.join("\n").trimEnd();
}

function truncateToLastSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  // Find the last sentence-ending punctuation followed by a space or end of string
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("!\n"),
    truncated.lastIndexOf("?\n"),
  );
  if (lastSentenceEnd > max * 0.5) return text.slice(0, lastSentenceEnd + 1).trimEnd();
  return truncated.trimEnd();
}

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: isEn
            ? `Generate a complete description for this cabin listing. Return ONLY the description text, no title, no header, no label, no section, no markdown, no asterisks, no hash (#), no counting. Start directly with the first sentence. ABSOLUTE CONSTRAINT: the description must be STRICTLY less than 2500 characters including spaces. Stop at a complete sentence before the limit. Never cut a sentence mid-way. Start with a strong hook sentence. Describe the atmosphere, highlights, and nearby activities.\n\nContext:\n${lines}`
            : `Génère une description complète pour cette annonce de chalet. Retourne UNIQUEMENT le texte de la description, sans titre, sans en-tête, sans label, sans section, sans markdown, sans astérisques, sans dièse (#), sans comptage. Commence directement par la première phrase de la description. CONTRAINTE ABSOLUE : la description doit faire STRICTEMENT moins de 2500 caractères, espaces compris. Arrête-toi à une phrase complète avant la limite. Ne jamais couper une phrase en plein milieu. Commence par une phrase d'accroche forte. Décris l'ambiance, les points forts, les activités à proximité. Ne tutoie jamais le voyageur, utilise "vous".\n\nContexte :\n${lines}`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return NextResponse.json({ error: "Génération échouée." }, { status: 500 });
    const cleaned = cleanDescription(raw);
    return NextResponse.json({ description: truncateToLastSentence(cleaned, 2500) });
  } catch (err) {
    console.error("[generate-description]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
