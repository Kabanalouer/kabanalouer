import { NextRequest, NextResponse } from "next/server";
import { recordError } from "@/lib/errorTracking";
import { SITE_URL } from "@/lib/siteUrl";

// Erreurs du navigateur (components/ErrorReporter.tsx, app/error.tsx) →
// lib/errorTracking.ts. Requêtes du site seulement, au plus 20 par minute et
// par IP (mémoire bornée), champs tronqués.

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;
const MAX_ENTRIES = 10_000;
const hits = new Map<string, { start: number; n: number }>();

function allowedOrigins(): Set<string> {
  const set = new Set<string>();
  for (const u of [SITE_URL, process.env.NEXT_PUBLIC_APP_URL ?? ""].filter(Boolean).map((x) => x.replace(/\/$/, ""))) {
    set.add(u);
    set.add(u.replace("://", "://www."));
  }
  return set;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

export async function POST(request: NextRequest) {
  if (!allowedOrigins().has(request.headers.get("origin") ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0].trim().slice(0, 64);
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && now - entry.start < WINDOW_MS) {
    if (++entry.n > MAX_PER_WINDOW) return NextResponse.json({ ok: true });
  } else {
    if (hits.size >= MAX_ENTRIES) hits.clear();
    hits.set(ip, { start: now, n: 1 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const message = str(body?.message, 1000);
  if (!message) return NextResponse.json({ error: "Message manquant" }, { status: 400 });

  await recordError({
    source: "client",
    message,
    stack: str(body?.stack, 4000),
    path: str(body?.path, 500),
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  return NextResponse.json({ ok: true });
}
