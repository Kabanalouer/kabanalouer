import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es un expert en rédaction d'annonces de location de chalet au Québec. " +
  "Tu maîtrises les meilleures pratiques d'Airbnb et Chalets.com. " +
  "Tu rédiges en français québécois, avec un ton chaleureux et authentique. Pas d'emojis. Sentence case. " +
  "La description est utilisée comme meta description sur Google. " +
  "Les 160 premiers caractères sont les plus importants pour le SEO — ils doivent contenir les mots-clés principaux (type de chalet, région, équipements phares) de façon naturelle. " +
  "La description complète doit aussi être optimisée pour apparaître dans les recherches des LLM et agents IA qui cherchent des chalets au Québec.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API Anthropic manquante." }, { status: 503 });
  }

  const {
    title,
    region,
    city,
    capacity,
    bedrooms,
    bathrooms,
    amenities,
    nearby_activities,
    price_low,
    price_on_request,
  } = await request.json();

  const lines = [
    title ? `Titre : ${title}` : null,
    region ? `Région : ${region}` : null,
    city ? `Ville : ${city}` : null,
    capacity ? `Capacité : ${capacity} personnes` : null,
    bedrooms ? `Chambres : ${bedrooms}` : null,
    bathrooms ? `Salles de bain : ${bathrooms}` : null,
    Array.isArray(amenities) && amenities.length > 0 ? `Caractéristiques : ${amenities.join(", ")}` : null,
    Array.isArray(nearby_activities) && nearby_activities.length > 0
      ? `Activités à proximité : ${nearby_activities.join(", ")}`
      : null,
    price_on_request
      ? `Prix : sur demande`
      : price_low
      ? `Prix : à partir de ${price_low} $/nuit`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

function stripTrailingMeta(text: string): string {
  // Remove any trailing block starting with known meta patterns or a bold line (**...)
  const patterns = [/\*\*Comptage[\s\S]*$/i, /Comptage des caractères[\s\S]*$/i, /\n---[\s\S]*$/, /\n\*\*[^\n]*$/];
  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, "");
  }
  return result.trimEnd();
}

function truncateToLastSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  // Find the last sentence-ending punctuation followed by a space or end of string
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("!\n"),
    truncated.lastIndexOf("?\n"),
  );
  if (lastSentenceEnd > max * 0.5) return text.slice(0, lastSentenceEnd + 1).trimEnd();
  return truncated.trimEnd();
}

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Génère une description complète pour cette annonce de chalet. CONTRAINTE ABSOLUE : la description doit faire STRICTEMENT moins de 2500 caractères, espaces compris. Compte les caractères avant de répondre. Arrête-toi à une phrase complète avant la limite. Ne jamais couper une phrase en plein milieu. Commence par une phrase d'accroche forte. Décris l'ambiance, les points forts, les activités à proximité. Ne tutoie jamais le voyageur, utilise "vous". Ne jamais inclure de comptage de caractères, de note, de commentaire ou d'explication à la fin de ta réponse. Retourne uniquement le texte de la description, rien d'autre.\n\nContexte :\n${lines}`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!raw) return NextResponse.json({ error: "Génération échouée." }, { status: 500 });
    const cleaned = stripTrailingMeta(raw);
    return NextResponse.json({ description: truncateToLastSentence(cleaned, 2500) });
  } catch (err) {
    console.error("[generate-description]", err);
    return NextResponse.json({ error: "Erreur lors de la génération." }, { status: 500 });
  }
}
