import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { EMAIL_TEMPLATES } from "@/lib/emailTemplates/registry";
import { fieldsToRow, rowToFields } from "@/lib/emailTemplates/resolve";
import { FIELD_KEYS, validateFields, type Lang, type TemplateFields } from "@/lib/emailTemplates/types";

// Textes modifiables des courriels (Admin → Séquences courriel).
// GET sans id : liste des courriels modifiables et langues déjà modifiées.
// GET ?id= : textes par défaut, textes enregistrés et repères d'un courriel.
// PUT { id, lang, fields } : enregistre. DELETE { id, lang } : revient au texte d'origine.

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
  return { userId: user.id };
}

function adminSupabase() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function parseLang(value: unknown): Lang | null {
  return value === "fr" || value === "en" ? value : null;
}

function parseFields(value: unknown): TemplateFields | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!FIELD_KEYS.every((k) => typeof v[k] === "string" && (v[k] as string).length <= 10_000)) return null;
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, v[k] as string])) as TemplateFields;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const admin = adminSupabase();
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    const { data, error } = await admin.from("email_templates").select("email_id, lang");
    if (error) return NextResponse.json({ error: "Erreur de lecture." }, { status: 500 });
    const customized: Record<string, Lang[]> = {};
    for (const row of data ?? []) (customized[row.email_id] ??= []).push(row.lang as Lang);
    return NextResponse.json({ editable: Object.keys(EMAIL_TEMPLATES), customized });
  }

  const def = EMAIL_TEMPLATES[id];
  if (!def) return NextResponse.json({ error: "Courriel inconnu" }, { status: 404 });
  const { data, error } = await admin.from("email_templates").select("*").eq("email_id", id);
  if (error) return NextResponse.json({ error: "Erreur de lecture." }, { status: 500 });
  const saved: Record<Lang, TemplateFields | null> = { fr: null, en: null };
  const updatedAt: Record<Lang, string | null> = { fr: null, en: null };
  for (const row of data ?? []) {
    const lang = parseLang(row.lang);
    if (!lang) continue;
    saved[lang] = rowToFields(row);
    updatedAt[lang] = row.updated_at as string;
  }
  return NextResponse.json({ id, placeholders: def.placeholders, defaults: def.defaults, saved, updatedAt });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { id?: unknown; lang?: unknown; fields?: unknown } | null;
  const def = typeof body?.id === "string" ? EMAIL_TEMPLATES[body.id] : undefined;
  const lang = parseLang(body?.lang);
  const fields = parseFields(body?.fields);
  if (!def || !lang || !fields) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const errors = validateFields(def, fields);
  if (errors.length) return NextResponse.json({ error: errors.join(" "), errors }, { status: 400 });

  const { error } = await adminSupabase()
    .from("email_templates")
    .upsert(
      { email_id: def.id, lang, ...fieldsToRow(fields), updated_at: new Date().toISOString(), updated_by: auth.userId },
      { onConflict: "email_id,lang" }
    );
  if (error) {
    console.error("[admin/email-templates] enregistrement", error);
    return NextResponse.json({ error: "L’enregistrement a échoué." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const body = (await request.json().catch(() => null)) as { id?: unknown; lang?: unknown } | null;
  const def = typeof body?.id === "string" ? EMAIL_TEMPLATES[body.id] : undefined;
  const lang = parseLang(body?.lang);
  if (!def || !lang) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const { error } = await adminSupabase().from("email_templates").delete().eq("email_id", def.id).eq("lang", lang);
  if (error) {
    console.error("[admin/email-templates] réinitialisation", error);
    return NextResponse.json({ error: "La réinitialisation a échoué." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
