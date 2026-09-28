import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { translateField, type Lang, type FieldType } from "@/lib/translateField";
import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";

const LANGS: Lang[] = ["fr", "en"];
const FIELD_TYPES: FieldType[] = ["title", "description", "caption", "roomName", "bio"];

// Cohérent avec les limites déjà appliquées côté formulaires (titre 50,
// description 2500 — voir generate-description) — caption/roomName/bio
// nouvelles ici, propres à cet endpoint uniquement.
const MAX_LENGTH: Record<FieldType, number> = {
  title: 50,
  description: 2500,
  caption: 100,
  roomName: 60,
  bio: 300,
};

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t2(locale, "Non autorisé", "Unauthorized") }, { status: 401 });

  if (!(await checkAiRateLimit(supabase, user.id, "translate-listing"))) {
    return NextResponse.json(
      { error: t2(locale, "Vous avez atteint la limite de 200 générations IA par heure. Réessayez plus tard.", "You have reached the limit of 200 AI generations per hour. Please try again later.") },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: t2(locale, "Clé API Anthropic manquante.", "Missing Anthropic API key.") }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t2(locale, "Requête invalide.", "Invalid request.") }, { status: 400 });
  }

  const { text, sourceLang, targetLang, fieldType } = (body ?? {}) as {
    text?: unknown;
    sourceLang?: unknown;
    targetLang?: unknown;
    fieldType?: unknown;
  };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: t2(locale, "Texte manquant.", "Missing text.") }, { status: 400 });
  }
  if (typeof fieldType !== "string" || !FIELD_TYPES.includes(fieldType as FieldType)) {
    return NextResponse.json({ error: t2(locale, "Type de champ invalide.", "Invalid field type.") }, { status: 400 });
  }
  if (typeof sourceLang !== "string" || !LANGS.includes(sourceLang as Lang)) {
    return NextResponse.json({ error: t2(locale, "Langue source invalide.", "Invalid source language.") }, { status: 400 });
  }
  if (typeof targetLang !== "string" || !LANGS.includes(targetLang as Lang)) {
    return NextResponse.json({ error: t2(locale, "Langue cible invalide.", "Invalid target language.") }, { status: 400 });
  }

  const field = fieldType as FieldType;
  const maxLength = MAX_LENGTH[field];
  if (text.length > maxLength) {
    return NextResponse.json(
      { error: t2(locale, `Le texte dépasse la limite de ${maxLength} caractères pour ce type de champ.`, `The text exceeds the ${maxLength}-character limit for this field type.`) },
      { status: 400 }
    );
  }

  try {
    const translation = await translateField({
      text,
      sourceLang: sourceLang as Lang,
      targetLang: targetLang as Lang,
      fieldType: field,
    });
    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate]", err);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la traduction.", "Error while translating.") }, { status: 500 });
  }
}
