// Exécute un actor Apify et attend son résultat (poll), utilisé pour l'import
// d'annonces depuis Airbnb/VRBO.

export type ImportPlatform = "airbnb" | "vrbo";

// `hostname.includes("airbnb.")` matchait à tort "airbnb.evil.com" — un
// attaquant aurait pu faire pointer l'actor Apify vers un domaine de son
// choix. Match par label de domaine exact (sous-domaine + TLD autorisé),
// jamais par simple sous-chaîne.
const AIRBNB_HOSTNAME = /^([a-z0-9-]+\.)?airbnb\.(com|ca|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2})$/i;
const VRBO_HOSTNAME = /^([a-z0-9-]+\.)?vrbo\.com$/i;

export function detectImportPlatform(url: string): ImportPlatform | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (AIRBNB_HOSTNAME.test(hostname)) return "airbnb";
  if (VRBO_HOSTNAME.test(hostname)) return "vrbo";
  return null;
}

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 2000;

// slash -> tilde, format attendu par l'API Apify pour un ID d'actor "user/name"
function actorPath(actorId: string): string {
  return actorId.replace("/", "~");
}

class ApifyImportError extends Error {}

export type ImportTranslator = (key: string, values?: Record<string, string | number>) => string;

export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs: number,
  t: ImportTranslator
): Promise<unknown[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new ApifyImportError(t("apifyConfigMissing"));
  }

  const startRes = await fetch(`${APIFY_BASE}/acts/${actorPath(actorId)}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!startRes.ok) {
    throw new ApifyImportError(t("apifyStartFailed", { status: startRes.status }));
  }
  const startData = await startRes.json();
  const runId: string | undefined = startData?.data?.id;
  if (!runId) {
    throw new ApifyImportError(t("apifyUnexpectedStartResponse"));
  }

  const deadline = Date.now() + timeoutMs;
  let status = "READY";
  let datasetId: string | undefined;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!pollRes.ok) continue; // erreur transitoire — on retente au prochain intervalle

    const pollData = await pollRes.json();
    status = pollData?.data?.status;
    datasetId = pollData?.data?.defaultDatasetId;

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new ApifyImportError(t("apifyRunFailed", { status }));
    }
  }

  if (status !== "SUCCEEDED") {
    throw new ApifyImportError(t("apifyTimeout"));
  }
  if (!datasetId) {
    throw new ApifyImportError(t("apifyNoDataset"));
  }

  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`);
  if (!itemsRes.ok) {
    throw new ApifyImportError(t("apifyItemsFetchFailed"));
  }
  return await itemsRes.json();
}

export { ApifyImportError };
