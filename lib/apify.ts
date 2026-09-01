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

export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 60000
): Promise<unknown[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new ApifyImportError("Configuration manquante côté serveur (APIFY_API_TOKEN).");
  }

  const startRes = await fetch(`${APIFY_BASE}/acts/${actorPath(actorId)}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!startRes.ok) {
    throw new ApifyImportError(`Impossible de démarrer l'extraction (Apify a répondu ${startRes.status}).`);
  }
  const startData = await startRes.json();
  const runId: string | undefined = startData?.data?.id;
  if (!runId) {
    throw new ApifyImportError("Réponse inattendue d'Apify au démarrage de l'extraction.");
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
      throw new ApifyImportError(`L'extraction a échoué (statut : ${status}).`);
    }
  }

  if (status !== "SUCCEEDED") {
    throw new ApifyImportError(
      "L'extraction prend plus de temps que prévu (plus de 60 secondes). Réessayez dans quelques instants."
    );
  }
  if (!datasetId) {
    throw new ApifyImportError("Réponse inattendue d'Apify : aucune donnée à récupérer.");
  }

  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`);
  if (!itemsRes.ok) {
    throw new ApifyImportError("Impossible de récupérer les données extraites.");
  }
  return await itemsRes.json();
}

export { ApifyImportError };
