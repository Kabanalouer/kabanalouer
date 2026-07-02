import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "listing-advice"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const {
    title, description, region, capacity, photo_count,
    amenities, nearby_activities, score, bio_filled, avatar_filled, locale,
  } = await request.json();

  const isEn = locale === "en";

  const lines = isEn
    ? [
        title ? `Title: ${title}` : "Title: (not filled in)",
        region ? `Region: ${region}` : null,
        capacity ? `Capacity: ${capacity} people` : null,
        `Number of photos: ${photo_count ?? 0}`,
        `Current optimization score: ${score}/100`,
        `Owner bio: ${bio_filled ? "filled in" : "missing"}`,
        `Profile photo: ${avatar_filled ? "filled in" : "missing"}`,
        Array.isArray(amenities) && amenities.length > 0
          ? `Amenities: ${amenities.join(", ")}`
          : "Amenities: none",
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Nearby activities: ${nearby_activities.join(", ")}`
          : "Nearby activities: none",
        description?.trim()
          ? `Description (excerpt): ${String(description).slice(0, 300)}…`
          : "Description: missing",
      ].filter(Boolean).join("\n")
    : [
        title ? `Titre : ${title}` : "Titre : (non renseigné)",
        region ? `Région : ${region}` : null,
        capacity ? `Capacité : ${capacity} personnes` : null,
        `Nombre de photos : ${photo_count ?? 0}`,
        `Score d'optimisation actuel : ${score}/100`,
        `Bio du propriétaire : ${bio_filled ? "remplie" : "manquante"}`,
        `Photo de profil : ${avatar_filled ? "remplie" : "manquante"}`,
        Array.isArray(amenities) && amenities.length > 0
          ? `Caractéristiques : ${amenities.join(", ")}`
          : "Caractéristiques : aucune",
        Array.isArray(nearby_activities) && nearby_activities.length > 0
          ? `Activités à proximité : ${nearby_activities.join(", ")}`
          : "Activités à proximité : aucune",
        description?.trim()
          ? `Description (extrait) : ${String(description).slice(0, 300)}…`
          : "Description : manquante",
      ].filter(Boolean).join("\n");

  const systemPrompt = isEn
    ? "You are an expert in optimizing vacation cabin rental listings in Quebec, Canada. " +
      "You give precise, concrete, and actionable tips in English. " +
      "No emojis. Sentence case. Your tips are tailored to THIS specific cabin, not generic advice."
    : "Tu es un expert en optimisation d'annonces de location de chalet au Québec. " +
      "Tu donnes des conseils précis, concrets et actionnables en français québécois. " +
      "Pas d'emojis. Sentence case. Tes conseils sont adaptés à CE chalet spécifique, pas des conseils génériques.";

  const userPrompt = isEn
    ? `Give exactly 3 concrete and personalized tips to improve this cabin listing. ` +
      `Each tip is 1-2 sentences maximum. ` +
      `Respond ONLY with strict JSON, no text before or after, exact format: {"conseils":["tip 1","tip 2","tip 3"]}\n\n` +
      `Listing context:\n${lines}`
    : `Donne exactement 3 conseils concrets et personnalisés pour améliorer cette annonce de chalet. ` +
      `Chaque conseil fait 1-2 phrases maximum. ` +
      `Réponds UNIQUEMENT en JSON strict, sans texte avant ni après, format exact : {"conseils":["conseil 1","conseil 2","conseil 3"]}\n\n` +
      `Contexte de l'annonce :\n${lines}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Format de réponse invalide." }, { status: 500 });
    const parsed = JSON.parse(jsonMatch[0]) as { conseils?: unknown };
    if (!Array.isArray(parsed.conseils)) return NextResponse.json({ error: "Format de réponse invalide." }, { status: 500 });
    return NextResponse.json({ conseils: (parsed.conseils as string[]).slice(0, 3) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listing-advice] error:", message);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
