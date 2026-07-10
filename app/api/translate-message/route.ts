import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { NextResponse } from "next/server";

const LANG_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "translate-message"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const { content, fromLanguage, toLanguage } = await request.json();

  if (!content?.trim() || !fromLanguage || !toLanguage) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  if (fromLanguage === toLanguage) {
    return NextResponse.json({ translation: content });
  }

  const from = LANG_NAMES[fromLanguage] || fromLanguage;
  const to = LANG_NAMES[toLanguage] || toLanguage;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Translate the following message from ${from} to ${to}. Return only the translation, no explanation, no quotes.\n\n${content}`,
        },
      ],
    });

    const translation =
      msg.content[0].type === "text" ? msg.content[0].text.trim() : content;

    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate-message]", err);
    return NextResponse.json({ error: "Erreur lors de la traduction." }, { status: 500 });
  }
}
