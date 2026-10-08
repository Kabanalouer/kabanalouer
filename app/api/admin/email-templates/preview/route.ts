import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplates/registry";
import { FIELD_KEYS, type Lang, type TemplateFields } from "@/lib/emailTemplates/types";
import { emailContext, type CapturedEmail } from "@/lib/emails/emailContext";
import { emailTestSenders } from "@/lib/emailTestSenders";

// Aperçu d'un courriel dans l'éditeur de textes (Admin → Séquences courriel) :
// données d'exemple de lib/emailTestSenders.ts, textes en cours d'édition (pas
// encore enregistrés). Rien n'est envoyé : le courriel est capturé (lib/emails/send.ts).

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: unknown; lang?: unknown; fields?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const lang: Lang = body?.lang === "en" ? "en" : "fr";
  const send = emailTestSenders()[id];
  if (!EMAIL_TEMPLATES[id] || !send) return NextResponse.json({ error: "Courriel inconnu" }, { status: 404 });

  const raw = body?.fields as Record<string, unknown> | undefined;
  const fields =
    raw && FIELD_KEYS.every((k) => typeof raw[k] === "string")
      ? (Object.fromEntries(FIELD_KEYS.map((k) => [k, raw[k] as string])) as TemplateFields)
      : undefined;

  let captured: CapturedEmail | null = null;
  try {
    await emailContext.run(
      { capture: (email) => { captured = email; }, overrides: fields ? { id, lang, fields } : undefined },
      () => send("apercu@kabanalouer.ca", lang)
    );
  } catch (err) {
    console.error(`[admin/email-templates/preview] ${id}`, err);
    return NextResponse.json({ error: "L’aperçu a échoué." }, { status: 500 });
  }
  if (!captured) return NextResponse.json({ error: "L’aperçu a échoué." }, { status: 500 });
  return NextResponse.json(captured);
}
