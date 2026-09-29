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

// Détecte seulement la langue (FR ou EN) d'un texte. Tout ce qui n'est pas
// reconnu comme de l'anglais est traité comme du français (langue par défaut
// du site). Retourne null en cas d'échec — à l'appelant de supposer le français.
export async function detectLanguage(text: string): Promise<SupportedLanguage | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const res = await fetch(`${ENDPOINT}/detect?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
    });
    if (!res.ok) {
      console.error(`[googleTranslate] détection ${res.status}`, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const language = data?.data?.detections?.[0]?.[0]?.language;
    if (typeof language !== "string") return null;
    return language.startsWith("en") ? "en" : "fr";
  } catch (err) {
    console.error("[googleTranslate] échec de la détection", err);
    return null;
  }
}

// Détecte la langue du texte (FR ou EN) et le traduit dans l'autre langue.
// Utilisé pour le contenu libre écrit par les utilisateurs (avis, réponses des
// proprios), dont on ne connaît pas la langue d'avance. Retourne null en cas
// d'échec — l'original reste affiché.
export async function detectAndTranslate(
  text: string
): Promise<{ lang: SupportedLanguage; translated: string } | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: "en", format: "text" }),
    });
    if (!res.ok) {
      console.error(`[googleTranslate] détection ${res.status}`, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const first = data?.data?.translations?.[0];
    const detected = typeof first?.detectedSourceLanguage === "string" ? first.detectedSourceLanguage : "";
    if (detected.startsWith("en")) {
      const toFr = await translateText(text, "en", "fr");
      return toFr ? { lang: "en", translated: toFr } : null;
    }
    const toEn = typeof first?.translatedText === "string" ? first.translatedText : "";
    return toEn ? { lang: "fr", translated: toEn } : null;
  } catch (err) {
    console.error("[googleTranslate] échec de la détection", err);
    return null;
  }
}
