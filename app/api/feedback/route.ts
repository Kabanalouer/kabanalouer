import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { triageFeedback } from "@/lib/feedback";
import { sendFeedbackMessage, type FeedbackKind } from "@/lib/emails/feedback";

// Retour d'un proprio depuis son tableau de bord (components/dashboard/FeedbackCard.tsx).
// Connexion obligatoire, au plus 5 retours par 24 h et par compte. Le message
// part tout de suite dans info@ (Reply-To = le proprio), puis Claude le trie
// après la réponse (after) et Simon reçoit l'analyse.

export const maxDuration = 60;

const KINDS = new Set<FeedbackKind>(["probleme", "idee", "autre"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { kind?: unknown; message?: unknown; page?: unknown } | null;
  const kind = (typeof body?.kind === "string" && KINDS.has(body.kind as FeedbackKind) ? body.kind : "autre") as FeedbackKind;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 3000) : "";
  const page = typeof body?.page === "string" ? body.page.slice(0, 300) : null;
  if (!message) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { count } = await admin
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "Trop de retours" }, { status: 429 });

  const { data: row, error } = await admin
    .from("feedback")
    .insert({ user_id: user.id, kind, message, page, user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[feedback] insertion", error?.message);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }

  const { data: profile } = await admin.from("users").select("name, email").eq("id", user.id).maybeSingle();
  const { error: mailError } = await sendFeedbackMessage({
    name: (profile?.name as string | null) ?? "",
    email: (profile?.email as string | null) ?? user.email ?? "info@kabanalouer.ca",
    kind,
    message,
  });
  if (mailError) console.error("[feedback] courriel", mailError.message);

  after(() => triageFeedback(row.id as number));
  return NextResponse.json({ ok: true });
}
