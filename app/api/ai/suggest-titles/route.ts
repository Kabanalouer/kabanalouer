import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT_FR =
  "Tu es un expert en rédaction d'annonces de location de chalet au Québec. " +
  "Tu maîtrises les meilleures pratiques d'Airbnb et Chalets.com. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et authentique. Pas d'emojis. Sentence case. " +
  "Le titre est aussi utilisé comme balise meta title sur Google et les moteurs de recherche. " +
  "Il doit contenir les mots-clés naturels que les voyageurs cherchent (ex: nom du chalet si connu, type de chalet, équipements phares, région). " +
  "Si le proprio a donné un nom propre à son chalet, le mettre en premier. " +
  "Pense aussi aux recherches faites dans les LLM comme ChatGPT. " +
  "RÈGLE SEO PRIORITAIRE : Si le titre actuel ou les informations de la fiche contiennent un nom propre de chalet (ex: 'Chalet Authentik 50', 'Chalet du Lac', 'Villa des Pins', etc.), AU MOINS 2 des 3 suggestions doivent commencer par ce nom propre. " +
  "Les voyageurs qui connaissent déjà ce chalet le cherchent par son nom sur Google — c'est le mot-clé SEO le plus important. " +
  "Détecte le nom propre dans le titre existant et utilise-le.";

const SYSTEM_PROMPT_EN =
  "You are an expert in writing vacation cabin rental listings in Quebec, Canada. " +
  "You follow best practices from Airbnb and Chalets.com. " +
  "You write in English with a warm, authentic tone. No emojis. Sentence case. " +
  "The title is also used as a meta title on Google and search engines. " +
  "It must contain natural keywords that travelers search for (e.g. cabin name if known, cabin type, key amenities, region). " +
  "If the owner has given their cabin a proper name, put it first. " +
  "Think also about searches made in LLMs like ChatGPT. " +
  "PRIORITY SEO RULE: If the current title or listing info contains a proper cabin name (e.g. 'Chalet Authentik 50', 'Lakeside Cabin', 'Pine Villa'), AT LEAST 2 of the 3 suggestions must start with that proper name. " +
  "Travelers who already know this cabin search for it by name on Google — it is the most important SEO keyword. " +
  "Detect the proper name in the existing title and use it.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "suggest-titles"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const { current_title, region, city, capacity, bedrooms, amenities, nearby_activities, locale } = await request.json();
  const isEn = locale === "en";
  const SYSTEM_PROMPT = isEn ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;

  const lines = isEn
    ? [
        current_title ? `Current title: ${current_title}` : null,
        region ? `Region: ${region}` : null,
        city ? `City: ${city}` : null,
        capacity ? `Capacity: ${capacity} people` : null,
        bedrooms ? `Bedrooms: ${bedrooms}` : null,
        Array.isArray(amenities) && amenities.length > 0 ? `Amenities: ${amenities.join(", ")}` : null,
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Nearby activities: ${nearby_activities.join(", ")}`
          : null,
      ].filter(Boolean).join("\n")
    : [
        current_title ? `Titre actuel : ${current_title}` : null,
        region ? `Région : ${region}` : null,
        city ? `Ville : ${city}` : null,
        capacity ? `Capacité : ${capacity} personnes` : null,
        bedrooms ? `Chambres : ${bedrooms}` : null,
        Array.isArray(amenities) && amenities.length > 0 ? `Caractéristiques : ${amenities.join(", ")}` : null,
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Activités à proximité : ${nearby_activities.join(", ")}`
          : null,
      ].filter(Boolean).join("\n");

  const userPrompt = isEn
    ? `Generate 3 title suggestions for this cabin listing. ABSOLUTE CONSTRAINT: each suggestion must be STRICTLY less than 50 characters including spaces. Count characters before responding. If a suggestion exceeds 50 characters, shorten it. Catchy, highlight the main feature. Respond ONLY with JSON, no explanation or extra text. JSON format: {"suggestions": ["str", "str", "str"]}\n\nContext:\n${lines}`
    : `Génère 3 suggestions de titre pour cette annonce de chalet. CONTRAINTE ABSOLUE : chaque suggestion doit faire STRICTEMENT moins de 50 caractères, espaces compris. Compte les caractères avant de répondre. Si une suggestion dépasse 50 caractères, raccourcis-la. Accrocheur, met en avant le point fort principal. Réponds UNIQUEMENT avec le JSON, sans explication ni texte supplémentaire. Format JSON : {"suggestions": ["str", "str", "str"]}\n\nContexte :\n${lines}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error("[suggest-titles] no JSON in response:", raw);
      throw new Error(`JSON introuvable dans la réponse : ${raw.slice(0, 200)}`);
    }
    const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: unknown };
    if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      console.error("[suggest-titles] unexpected shape:", parsed);
      throw new Error("Format de réponse inattendu.");
    }
    const suggestions = (parsed.suggestions as string[]).map((s) => String(s).slice(0, 50));
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[suggest-titles]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
