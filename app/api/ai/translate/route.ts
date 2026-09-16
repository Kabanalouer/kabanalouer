import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/aiRateLimit";
import { translateField, type Lang, type FieldType } from "@/lib/translateField";
import { NextResponse } from "next/server";

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
    const translation = await translateField({
      text,
      sourceLang: sourceLang as Lang,
      targetLang: targetLang as Lang,
      fieldType: field,
    });
    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate]", err);
    return NextResponse.json({ error: "Erreur lors de la traduction." }, { status: 500 });
  }
}
