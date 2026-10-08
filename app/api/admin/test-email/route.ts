import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_CATALOG } from "@/lib/adminEmailCatalog";
import { emailTestSenders, type Lang } from "@/lib/emailTestSenders";

// Envoi de test d'un courriel du catalogue (Admin → Séquences courriel), avec
// les données d'exemple de lib/emailTestSenders.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: unknown; to?: unknown; lang?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const lang: Lang = body?.lang === "en" ? "en" : "fr";

  const entry = EMAIL_CATALOG.find((e) => e.id === id);
  const send = emailTestSenders()[id];
  if (!entry || !entry.testable || !send) return NextResponse.json({ error: "Courriel inconnu" }, { status: 400 });
  if (!entry.fixedRecipient && !EMAIL_RE.test(to)) return NextResponse.json({ error: "Adresse courriel invalide" }, { status: 400 });

  try {
    const { error } = await send(to, lang);
    if (error) {
      console.error(`[admin/test-email] ${id}`, error);
      return NextResponse.json({ error: "L’envoi a échoué (voir les journaux)." }, { status: 502 });
    }
  } catch (err) {
    console.error(`[admin/test-email] ${id}`, err);
    return NextResponse.json({ error: "L’envoi a échoué (voir les journaux)." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, to: entry.fixedRecipient ?? to });
}
