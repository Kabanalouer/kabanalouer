export type PhotoItem = { url: string; caption: string; sizeMb?: number };

/** Handles both legacy string[] and new {url,caption}[] from the DB. */
export function normalizePhotos(raw: unknown): PhotoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { url: item, caption: "" };
    if (item && typeof item === "object" && "url" in item) {
      const obj = item as { url: unknown; caption?: unknown; sizeMb?: unknown };
      return {
        url: String(obj.url),
        caption: String(obj.caption ?? ""),
        ...(typeof obj.sizeMb === "number" ? { sizeMb: obj.sizeMb } : {}),
      };
    }
    return { url: String(item), caption: "" };
  });
}

/** Safely extract the first photo URL from a raw DB value (string or object). */
export function firstPhotoUrl(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const first = raw[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) return String((first as { url: unknown }).url);
  return undefined;
}
