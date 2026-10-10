import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { FUNNEL_STEPS } from "@/lib/funnel";
import { SITE_URL } from "@/lib/siteUrl";

// Incrémente le compteur anonyme d'une étape de tunnel (lib/funnel.ts).
// Étapes inconnues refusées ; aucune donnée personnelle reçue ni stockée.
// Garde-fous contre le gonflage des chiffres : requêtes du site seulement
// (en-tête Origin) et une seule fois par IP et par étape toutes les 30 min
// (en mémoire, remis à zéro au démarrage d'une instance — suffisant ici, même
// approche que /api/views). L'IP sert uniquement à ce filtre, jamais stockée.
// L'en-tête Origin se falsifie hors navigateur : c'est un filtre de base, pas
// une protection forte — acceptable pour des compteurs anonymes sans enjeu.

const ALLOWED = new Set<string>(FUNNEL_STEPS);
const THROTTLE_MS = 30 * 60 * 1000;
const throttle = new Map<string, number>();
const MAX_ENTRIES = 10_000;

function allowedOrigins(): Set<string> {
  const urls = [SITE_URL, process.env.NEXT_PUBLIC_APP_URL ?? ""].filter(Boolean).map((u) => u.replace(/\/$/, ""));
  const set = new Set<string>();
  for (const u of urls) {
    set.add(u);
    set.add(u.replace("://", "://www."));
  }
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3000");
    set.add("http://localhost:3123");
  }
  return set;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins().has(origin)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { step?: unknown } | null;
  const step = typeof body?.step === "string" ? body.step : "";
  if (!ALLOWED.has(step)) return NextResponse.json({ error: "Étape inconnue" }, { status: 400 });

  // IP fournie par Vercel (le client ne peut pas la remplacer), sinon x-forwarded-for en local
  const ip = (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0].trim().slice(0, 64);
  const key = `${ip}:${step}`;
  const now = Date.now();
  const last = throttle.get(key);
  if (last && now - last < THROTTLE_MS) return NextResponse.json({ ok: true });
  // Mémoire bornée : on purge les entrées expirées, et si un afflux d'adresses
  // différentes remplit quand même la table, on la vide plutôt que de grossir.
  if (throttle.size >= MAX_ENTRIES) {
    for (const [k, t] of throttle) if (now - t >= THROTTLE_MS) throttle.delete(k);
    if (throttle.size >= MAX_ENTRIES) throttle.clear();
  }
  throttle.set(key, now);

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.rpc("increment_funnel_step", { p_step: step });
  if (error) console.error("[funnel]", step, error.message);
  return NextResponse.json({ ok: true });
}
