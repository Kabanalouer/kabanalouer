// Envoi d'une erreur du navigateur à /api/errors (lib/errorTracking.ts).
// Bruit ignoré : extensions du navigateur, scripts tiers illisibles, coupures
// réseau, avertissement ResizeObserver. Au plus 5 envois par page.

const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Failed to fetch|Load failed|NetworkError|network error/i,
  /AbortError|The operation was aborted/i,
  /Loading chunk \d+ failed|ChunkLoadError/i,
];

let sent = 0;

export function reportClientError(error: unknown, extra?: { digest?: string }): void {
  try {
    if (sent >= 5) return;
    const err = error instanceof Error ? error : null;
    const message = err?.message ?? (typeof error === "string" ? error : JSON.stringify(error ?? "Erreur inconnue"));
    const stack = err?.stack ?? "";
    if (!message || IGNORED.some((re) => re.test(message))) return;
    if (/chrome-extension:|moz-extension:|safari-web-extension:/.test(stack)) return;
    sent++;
    const body = JSON.stringify({
      message: extra?.digest ? `${message} (digest ${extra.digest})` : message,
      stack: stack.slice(0, 4000),
      path: window.location.pathname,
    });
    fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // jamais bloquant
  }
}
