import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "Tu es un spécialiste en rédaction de présentation pour les propriétaires de chalet au Québec. " +
  "Rédige une courte présentation en français québécois naturel pour un propriétaire de chalet, à la première personne, maximum 280 caractères. " +
  "Utilise le prénom fourni. Pas d'emojis. Sentence case. " +
  "Ton : chaleureux et authentique, mais professionnel. Jamais trop familier. " +
  "Interdire absolument toute accroche décontractée comme 'Yo', 'Salut!', 'Hey', 'Allo les amis', 'Bonjour tout le monde' ou toute formule similaire. " +
  "La bio doit commencer par une phrase sobre et accueillante qui présente le propriétaire (ex. : 'Je m'appelle [prénom] et…' ou '[Prénom], propriétaire de chalet depuis…').";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const { firstName } = await request.json();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Prénom : ${firstName || "le propriétaire"}` }],
  });

  const bio = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  return NextResponse.json({ bio });
}
