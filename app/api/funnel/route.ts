import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { FUNNEL_STEPS } from "@/lib/funnel";

// Incrémente le compteur anonyme d'une étape de tunnel (lib/funnel.ts).
// Étapes inconnues refusées ; aucune donnée personnelle reçue ni stockée.

const ALLOWED = new Set<string>(FUNNEL_STEPS);

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { step?: unknown } | null;
  const step = typeof body?.step === "string" ? body.step : "";
  if (!ALLOWED.has(step)) return NextResponse.json({ error: "Étape inconnue" }, { status: 400 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.rpc("increment_funnel_step", { p_step: step });
  if (error) console.error("[funnel]", step, error.message);
  return NextResponse.json({ ok: true });
}
