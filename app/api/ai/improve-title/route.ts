import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es un expert en optimisation de titres pour annonces de location de chalets. " +
  "Tu connais les meilleures pratiques Airbnb pour les titres qui convertissent. " +
  "Tu dois proposer UN seul titre accrocheur, évocateur et optimisé pour les moteurs de recherche. " +
  "Le titre doit OBLIGATOIREMENT faire 50 caractères ou moins. " +
  "Réponds UNIQUEMENT avec le titre, sans guillemets, sans explication.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "improve-title"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const { title, region, capacity, amenities } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  }

  const context = [
    `Titre actuel : "${title}"`,
    region ? `Région : ${region}` : null,
    capacity ? `Capacité : ${capacity} personnes` : null,
    Array.isArray(amenities) && amenities.length > 0
      ? `Équipements : ${amenities.slice(0, 8).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: context }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return NextResponse.json({ error: "Génération échouée." }, { status: 500 });

    return NextResponse.json({ title: raw.slice(0, 50) });
  } catch (err) {
    console.error("[improve-title]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
