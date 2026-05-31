import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es un expert en référencement SEO pour les chalets au Québec. " +
  "Génère une légende descriptive en français québécois pour cette photo de chalet. " +
  "Ta réponse doit faire 99 caractères maximum, espaces inclus. Ne dépasse jamais cette limite. " +
  "Décris ce qu'on voit : la pièce, la vue, l'équipement ou l'ambiance. " +
  "Sois précis et naturel, évite les superlatifs.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const body = await request.json();
  const url: unknown = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL manquante." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url },
            },
            {
              type: "text",
              text: "Génère une légende pour cette photo. Retourne UNIQUEMENT la légende, sans guillemets, sans ponctuation finale, sans markdown. Ta réponse doit faire 99 caractères maximum, espaces inclus. Ne dépasse jamais cette limite.",
            },
          ],
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return NextResponse.json({ error: "Génération échouée." }, { status: 500 });

    const caption = raw.replace(/^["«»"]+|["«»"]+$/g, "");
    return NextResponse.json({ caption });
  } catch (err) {
    console.error("[generate-caption]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
