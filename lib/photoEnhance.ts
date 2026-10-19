import sharp from "sharp";

// Agrandissement des photos importées par IA (Real-ESRGAN sur Replicate) : les sources ne
// fournissent que 800 px de large, ce qui paraît pixelisé sur la fiche. Décision de Simon
// (2026-10-19) : toutes les photos de chaque fiche importée, sans rien demander au proprio.
// Jamais bloquant : sans jeton, ou si le service échoue, la photo reste telle quelle (null).
// Sans REPLICATE_API_TOKEN (variable serveur), rien n'est appelé.

const MODEL_URL = "https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions";
const MAX_OUTPUT_WIDTH = 2048;

type Prediction = { status?: string; output?: unknown; error?: string | null; urls?: { get?: string } };

async function replicate(url: string, init?: RequestInit): Promise<{ status: number; body: Prediction }> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Prediction };
}

// Renvoie la photo agrandie (WebP, 2048 px au plus), ou null si elle doit rester telle quelle.
export async function enhancePhoto(webp: Buffer): Promise<Buffer | null> {
  if (!process.env.REPLICATE_API_TOKEN) return null;
  try {
    const meta = await sharp(webp).metadata();
    if (!meta.width || meta.width >= MAX_OUTPUT_WIDTH) return null;
    const jpeg = await sharp(webp).jpeg({ quality: 92 }).toBuffer();
    const input = { image: `data:image/jpeg;base64,${jpeg.toString("base64")}`, scale: 2, face_enhance: false };

    let created: { status: number; body: Prediction } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      created = await replicate(MODEL_URL, { method: "POST", headers: { Prefer: "wait=60" }, body: JSON.stringify({ input }) });
      if (created.status === 201 || created.status === 200) break;
      // 429 (limite de débit) et 5xx : nouvel essai ; 402 (crédit) et autres : abandon
      if (created.status !== 429 && created.status < 500) break;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    if (!created || (created.status !== 201 && created.status !== 200)) {
      console.error("[photoEnhance] refus du service", created?.status, created?.body?.error ?? "");
      return null;
    }

    let prediction = created.body;
    for (let i = 0; i < 30 && prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled"; i++) {
      if (!prediction.urls?.get) return null;
      await new Promise((r) => setTimeout(r, 2000));
      prediction = (await replicate(prediction.urls.get)).body;
    }
    if (prediction.status !== "succeeded") {
      console.error("[photoEnhance] échec", prediction.status, prediction.error ?? "");
      return null;
    }
    const outUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (typeof outUrl !== "string" || !outUrl.startsWith("https://")) return null;

    const res = await fetch(outUrl);
    if (!res.ok) return null;
    const up = Buffer.from(await res.arrayBuffer());
    const out = await sharp(up).resize({ width: MAX_OUTPUT_WIDTH, height: MAX_OUTPUT_WIDTH, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const outMeta = await sharp(out).metadata();
    // Garde-fou : le résultat doit être nettement plus grand que la source, sinon on la garde
    if (!outMeta.width || outMeta.width < meta.width * 1.5) return null;
    return out;
  } catch (err) {
    console.error("[photoEnhance] erreur", (err as Error).message);
    return null;
  }
}

// Agrandit un lot de photos, 3 à la fois. Les photos non agrandies sont renvoyées telles quelles.
export async function enhancePhotos<T extends { webp: Buffer }>(items: T[]): Promise<{ items: T[]; enhanced: number }> {
  const out: T[] = [];
  let enhanced = 0;
  for (let i = 0; i < items.length; i += 3) {
    const results = await Promise.all(
      items.slice(i, i + 3).map(async (item) => {
        const up = await enhancePhoto(item.webp);
        if (up) enhanced++;
        return up ? { ...item, webp: up } : item;
      })
    );
    out.push(...results);
  }
  return { items: out, enhanced };
}
