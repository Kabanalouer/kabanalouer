import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es un expert en rédaction d'annonces de location de chalet au Québec. " +
  "Tu maîtrises les meilleures pratiques d'Airbnb et Chalets.com. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et authentique. Pas d'emojis. Sentence case. " +
  "Le titre est aussi utilisé comme balise meta title sur Google et les moteurs de recherche. " +
  "Il doit contenir les mots-clés naturels que les voyageurs cherchent (ex: nom du chalet si connu, type de chalet, équipements phares, région). " +
  "Si le proprio a donné un nom propre à son chalet, le mettre en premier. " +
  "Pense aussi aux recherches faites dans les LLM comme ChatGPT.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const { region, city, capacity, bedrooms, amenities, nearby_activities } = await request.json();

  const lines = [
    region ? `Région : ${region}` : null,
    city ? `Ville : ${city}` : null,
    capacity ? `Capacité : ${capacity} personnes` : null,
    bedrooms ? `Chambres : ${bedrooms}` : null,
    Array.isArray(amenities) && amenities.length > 0 ? `Caractéristiques : ${amenities.join(", ")}` : null,
    Array.isArray(nearby_activities) && nearby_activities.length > 0
      ? `Activités à proximité : ${nearby_activities.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Génère 3 suggestions de titre pour cette annonce de chalet. CONTRAINTE ABSOLUE : chaque suggestion doit faire STRICTEMENT moins de 50 caractères, espaces compris. Compte les caractères avant de répondre. Si une suggestion dépasse 50 caractères, raccourcis-la. Accrocheur, met en avant le point fort principal. Format JSON : {"suggestions": ["str", "str", "str"]}\n\nContexte :\n${lines}`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON introuvable dans la réponse.");
    const parsed = JSON.parse(jsonMatch[0]);
    const suggestions = (parsed.suggestions as string[]).map((s) => s.slice(0, 50));
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[suggest-titles]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
