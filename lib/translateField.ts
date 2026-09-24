import Anthropic from "@anthropic-ai/sdk";

export type Lang = "fr" | "en";
export type FieldType = "title" | "description" | "caption" | "roomName" | "bio";

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
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: MAX_TOKENS[fieldType],
    system: buildSystemPrompt(fieldType, sourceLang, targetLang),
    messages: [{ role: "user", content: text }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  if (!raw) throw new Error("Traduction vide.");
  return raw.replace(/^["«»"]+|["«»"]+$/g, "").trim();
}
