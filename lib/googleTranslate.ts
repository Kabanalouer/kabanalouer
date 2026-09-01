// Traduction FR/EN via l'API Google Cloud Translation (v2, Basic — clé API,
// pas de compte de service). Ne lève jamais d'exception : un échec retourne
// simplement null, à l'appelant de décider quoi faire (ici : ne rien afficher
// de traduit, le message original reste utilisé).

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

export type SupportedLanguage = "fr" | "en";

export async function translateText(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || !text.trim() || source === target) return null;

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target, format: "text" }),
    });

    if (!res.ok) {
      console.error(`[googleTranslate] réponse ${res.status}`, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const translated = data?.data?.translations?.[0]?.translatedText;
    return typeof translated === "string" && translated.length > 0 ? translated : null;
  } catch (err) {
    console.error("[googleTranslate] échec de l'appel API", err);
    return null;
  }
}
