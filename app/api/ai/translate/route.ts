import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { NextResponse } from "next/server";

type Lang = "fr" | "en";
type FieldType = "title" | "description" | "caption" | "roomName" | "bio";

const LANGS: Lang[] = ["fr", "en"];
const FIELD_TYPES: FieldType[] = ["title", "description", "caption", "roomName", "bio"];

// Cohérent avec les limites déjà appliquées côté formulaires (titre 50,
// description 2500 — voir generate-description) — caption/roomName/bio
// nouvelles ici, propres à cet endpoint uniquement.
const MAX_LENGTH: Record<FieldType, number> = {
  title: 50,
  description: 2500,
  caption: 200,
  roomName: 60,
  bio: 300,
};

const MAX_TOKENS: Record<FieldType, number> = {
  title: 150,
  description: 2048,
  caption: 300,
  roomName: 150,
  bio: 400,
};

const LANG_NAME: Record<Lang, string> = {
  fr: "français québécois",
  en: "anglais naturel",
};

const FIELD_TONE: Record<FieldType, string> = {
  title:
    "Le texte est le titre d'une annonce de chalet — garde le ton marketing accrocheur et chaleureux du texte d'origine, sans l'intensifier ni l'exagérer.",
  description:
    "Le texte est la description d'une annonce de chalet — garde le ton marketing chaleureux et professionnel du texte d'origine, cohérent avec le style Airbnb/Chalets.com.",
  caption:
    "Le texte est la légende d'une photo de chalet — reste factuel et concis, sans ajouter de détails absents de l'original.",
  roomName:
    "Le texte est le nom d'une chambre ou d'un espace du chalet — reste factuel et court.",
  bio:
    "Le texte est la présentation à la première personne d'un propriétaire de chalet — conserve la première personne et le ton personnel, chaleureux mais professionnel, du texte d'origine.",
};

function buildSystemPrompt(fieldType: FieldType, sourceLang: Lang, targetLang: Lang): string {
  return (
    `Tu es un traducteur professionnel spécialisé dans les annonces de location de chalet au Québec. ` +
    `Traduis fidèlement le texte fourni du ${LANG_NAME[sourceLang]} vers le ${LANG_NAME[targetLang]}. ` +
    `Ne reformule pas, n'améliore pas, ne raccourcis pas et ne résume pas le texte — traduis-le fidèlement, en conservant le sens et le ton d'origine. ` +
    `${FIELD_TONE[fieldType]} ` +
    (targetLang === "fr"
      ? `N'utilise jamais le mot « hôte » — utilise « propriétaire » si le contexte s'y prête. `
      : "") +
    `Ne tutoie jamais le voyageur si le texte s'adresse à lui — utilise "vous"/"you" selon la langue cible. ` +
    `Ne jamais ajouter de commentaire, d'explication, de guillemets ou de markdown. Retourne UNIQUEMENT le texte traduit, rien d'autre.`
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "translate-listing"))) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 20 générations IA par heure. Réessayez plus tard." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { text, sourceLang, targetLang, fieldType } = (body ?? {}) as {
    text?: unknown;
    sourceLang?: unknown;
    targetLang?: unknown;
    fieldType?: unknown;
  };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texte manquant." }, { status: 400 });
  }
  if (typeof fieldType !== "string" || !FIELD_TYPES.includes(fieldType as FieldType)) {
    return NextResponse.json({ error: "Type de champ invalide." }, { status: 400 });
  }
  if (typeof sourceLang !== "string" || !LANGS.includes(sourceLang as Lang)) {
    return NextResponse.json({ error: "Langue source invalide." }, { status: 400 });
  }
  if (typeof targetLang !== "string" || !LANGS.includes(targetLang as Lang)) {
    return NextResponse.json({ error: "Langue cible invalide." }, { status: 400 });
  }

  const field = fieldType as FieldType;
  const maxLength = MAX_LENGTH[field];
  if (text.length > maxLength) {
    return NextResponse.json(
      { error: `Le texte dépasse la limite de ${maxLength} caractères pour ce type de champ.` },
      { status: 400 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS[field],
      system: buildSystemPrompt(field, sourceLang as Lang, targetLang as Lang),
      messages: [{ role: "user", content: text }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return NextResponse.json({ error: "Traduction échouée." }, { status: 500 });

    const translation = raw.replace(/^["«»"]+|["«»"]+$/g, "").trim();
    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate]", err);
    return NextResponse.json({ error: "Erreur lors de la traduction." }, { status: 500 });
  }
}
