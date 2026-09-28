import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { translateField } from "@/lib/translateField";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "Tu es un spécialiste en rédaction de présentation pour les propriétaires de chalet au Québec. " +
  "Rédige une courte présentation en français québécois naturel pour un propriétaire de chalet, à la première personne, maximum 280 caractères. " +
  "Utilise le prénom fourni. Pas d'emojis. Sentence case. " +
  "Ton : chaleureux et authentique, mais professionnel. Jamais trop familier. " +
  "Interdire absolument toute accroche décontractée comme 'Yo', 'Salut!', 'Hey', 'Allo les amis', 'Bonjour tout le monde' ou toute formule similaire. " +
  "La bio doit commencer par une phrase sobre et accueillante qui présente le propriétaire (ex. : 'Je m'appelle [prénom] et…' ou '[Prénom], propriétaire de chalet depuis…').";

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "generate-bio"))) {
    return NextResponse.json(
      { error: t2(locale, "Vous avez atteint la limite de 200 générations IA par heure. Réessayez plus tard.", "You have reached the limit of 200 AI generations per hour. Please try again later.") },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: t2(locale, "Clé API Anthropic manquante.", "Missing Anthropic API key.") }, { status: 503 });
  }

  const { firstName } = await request.json();

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Prénom : ${firstName || "le propriétaire"}` }],
  });

  const bio = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  // Version anglaise générée en même temps, pour que la bio s'affiche aussi
  // en anglais sur la fiche (champ bio_en du profil). Un échec laisse le
  // champ anglais tel quel — le cron de traduction le remplira plus tard.
  let bioEn: string | null = null;
  if (bio) {
    try {
      bioEn = await translateField({ text: bio, sourceLang: "fr", targetLang: "en", fieldType: "bio" });
    } catch (err) {
      console.error("generate-bio: échec de la traduction anglaise", err);
    }
  }
  return NextResponse.json({ bio, bioEn });
}
