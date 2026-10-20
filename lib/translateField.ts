import Anthropic from "@anthropic-ai/sdk";

export type Lang = "fr" | "en";
export type FieldType = "title" | "description" | "caption" | "roomName" | "bio";

const MAX_TOKENS: Record<FieldType, number> = {
  // Large marge : les jetons de « réflexion » du modèle comptent dans la limite ; une limite trop juste
  // laissait parfois la réponse sans aucun texte (« Traduction vide », 2026-10-20).
  title: 2000,
  description: 8000,
  caption: 2000,
  roomName: 1500,
  bio: 4000,
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
      ? `N'utilise jamais le mot « hôte » — utilise « propriétaire » si le contexte s'y prête. `
      : "") +
    `Ne tutoie jamais le voyageur si le texte s'adresse à lui — utilise "vous"/"you" selon la langue cible. ` +
    `Ne jamais ajouter de commentaire, d'explication, de guillemets ou de markdown. Retourne UNIQUEMENT le texte traduit, rien d'autre.`
  );
}

export async function translateField({
  text, sourceLang, targetLang, fieldType,
}: {
  text: string;
  sourceLang: Lang;
  targetLang: Lang;
  fieldType: FieldType;
}): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Deux essais : si la réponse est vide ou coupée, on redemande avec une limite doublée
  let lastError = "Traduction vide.";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const msg = await anthropic.messages.create({
      // Haiku (2026-10-20) : environ 5 fois moins cher que Sonnet, largement suffisant pour traduire un texte fourni
      model: "claude-haiku-5-5",
      max_tokens: MAX_TOKENS[fieldType] * attempt,
      system: buildSystemPrompt(fieldType, sourceLang, targetLang),
      messages: [{ role: "user", content: text }],
    });
    // Certains modèles renvoient d'abord un bloc de réflexion : lire le premier bloc de TEXTE, pas content[0]
    const textBlock = msg.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    // Une traduction coupée par la limite de longueur ne doit jamais être enregistrée
    if (msg.stop_reason === "max_tokens") { lastError = raw ? "Traduction coupée avant la fin." : "Traduction vide (limite de longueur atteinte)."; continue; }
    if (!raw) { lastError = `Traduction vide (réponse sans texte, arrêt : ${msg.stop_reason ?? "inconnu"}).`; continue; }
    return raw.replace(/^["«»"]+|["«»"]+$/g, "").trim();
  }
  throw new Error(lastError);
}
