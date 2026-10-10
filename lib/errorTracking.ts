import { createHash } from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendErrorAlert } from "@/lib/emails/errorAlert";

// Suivi des erreurs (Admin → Erreurs, table error_groups, supabase/add-error-groups.sql).
// Sources : erreurs du navigateur (/api/errors), erreurs serveur non gérées
// (onRequestError, instrumentation.ts) et tout console.error côté serveur
// (erreurs gérées des tâches automatiques, envois de courriel ratés…).
// Production seulement : le développement local partage la même base.
// Ne lance jamais d'exception et n'appelle jamais console.error (boucle).

export type ErrorSource = "client" | "server";

export type ErrorReport = {
  source: ErrorSource;
  message: string;
  path?: string | null;
  stack?: string | null;
  userAgent?: string | null;
};

const ENABLED = process.env.VERCEL_ENV === "production";
// Une même erreur en rafale : enregistrée au plus une fois par minute et par instance.
const THROTTLE_MS = 60 * 1000;
const MAX_THROTTLE_ENTRIES = 2_000;
// Au plus 10 alertes courriel par heure et par instance.
const MAX_ALERTS_PER_HOUR = 10;

const recent = new Map<string, number>();
let alertWindowStart = 0;
let alertsInWindow = 0;
const rawConsoleError = console.error.bind(console);

// Message sans les parties variables (identifiants, nombres, courriels, jetons)
// pour regrouper les occurrences d'une même erreur.
export function normalizeMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<courriel>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<jeton>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function fingerprint(source: ErrorSource, message: string): string {
  return createHash("sha1").update(`${source}|${normalizeMessage(message)}`).digest("hex").slice(0, 32);
}

export async function recordError(report: ErrorReport): Promise<void> {
  if (!ENABLED) return;
  try {
    const message = (report.message || "Erreur sans message").slice(0, 1000);
    const fp = fingerprint(report.source, message);
    const now = Date.now();
    const last = recent.get(fp);
    if (last && now - last < THROTTLE_MS) return;
    if (recent.size >= MAX_THROTTLE_ENTRIES) recent.clear();
    recent.set(fp, now);

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: isNewOrBack, error } = await admin.rpc("record_error", {
      p_fingerprint: fp,
      p_source: report.source,
      p_message: message,
      p_path: report.path ?? null,
      p_stack: report.stack ?? null,
      p_user_agent: report.userAgent ?? null,
    });
    if (error) {
      rawConsoleError("[errorTracking] record_error", error.message);
      return;
    }
    if (!isNewOrBack) return;

    if (now - alertWindowStart > 60 * 60 * 1000) {
      alertWindowStart = now;
      alertsInWindow = 0;
    }
    if (alertsInWindow >= MAX_ALERTS_PER_HOUR) return;
    alertsInWindow++;
    const { error: sendError } = await sendErrorAlert({ source: report.source, message, path: report.path ?? null });
    if (!sendError) await admin.from("error_groups").update({ notified_at: new Date().toISOString() }).eq("fingerprint", fp);
  } catch (err) {
    rawConsoleError("[errorTracking] échec", err);
  }
}

function describe(arg: unknown): string {
  if (arg instanceof Error) return arg.message;
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

// Tout console.error côté serveur est aussi enregistré (sans rien changer à l'affichage dans les journaux).
let installed = false;
export function installConsoleErrorCapture(): void {
  if (!ENABLED || installed) return;
  installed = true;
  console.error = (...args: unknown[]) => {
    rawConsoleError(...args);
    const message = args.map(describe).join(" ").slice(0, 1000);
    const err = args.find((a): a is Error => a instanceof Error);
    // Pas d'await : l'enregistrement ne doit jamais ralentir la requête.
    void recordError({ source: "server", message, stack: err?.stack ?? null });
  };
}
