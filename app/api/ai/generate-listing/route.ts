import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en marketing immobilier spécialisé dans la location de chalets au Québec.
Tu crées des descriptions authentiques, évocatrices et vendeuses pour des propriétaires qui veulent louer leur chalet.
Ton style est chaleureux, inspire l'envie de déconnecter, et met en valeur l'expérience unique du chalet québécois.
Réponds TOUJOURS avec du JSON valide, sans markdown, exactement ce format :
{"title": "titre accrocheur ici", "description": "description complète ici"}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "generate-listing"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans vos variables d'environnement." },
      { status: 503 }
    );
  }

  const { region, amenities, capacity, bedrooms, bathrooms } = await request.json();

  if (!region || !capacity) {
    return NextResponse.json(
      { error: "Région et capacité requises." },
      { status: 400 }
    );
  }

  const amenitiesList =
    Array.isArray(amenities) && amenities.length > 0
      ? amenities.join(", ")
      : "non précisés";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Génère un titre accrocheur (max 70 caractères) et une description vendeuse (150-250 mots) pour ce chalet :

Région : ${region}
Capacité : ${capacity} personnes
Chambres : ${bedrooms} | Salles de bain : ${bathrooms}
Équipements : ${amenitiesList}

Le titre doit être unique et évoquer l'expérience. La description doit donner envie, décrire l'atmosphère, les activités et les équipements clés.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Réponse inattendue de l'IA");
    }

    const parsed = JSON.parse(content.text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération. Réessayez." },
      { status: 500 }
    );
  }
}
