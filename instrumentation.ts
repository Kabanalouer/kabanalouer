import type { Instrumentation } from "next";

// Suivi des erreurs (lib/errorTracking.ts) : capture des console.error et des
// erreurs serveur non gérées. Node.js seulement (pas de runtime Edge).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installConsoleErrorCapture } = await import("./lib/errorTracking");
    installConsoleErrorCapture();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordError } = await import("./lib/errorTracking");
  const e = err as Error;
  await recordError({ source: "server", message: e?.message ?? String(err), stack: e?.stack ?? null, path: request.path });
};
