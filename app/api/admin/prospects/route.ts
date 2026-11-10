import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";

// Actions de la liste Admin → Prospects (admin seulement). « queue » met le site en file d'attente : aucune fiche
// n'est créée ici, la création des brouillons et de la note d'invitation se fait à la demande de Simon.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// action → [statuts de départ autorisés, nouveau statut]
const TRANSITIONS: Record<string, [string[], string]> = {
  queue: [["nouveau"], "a_creer"],
  unqueue: [["a_creer"], "nouveau"],
  ignore: [["nouveau", "a_creer"], "ignore"],
  restore: [["ignore"], "nouveau"],
};

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return null;
}

// POST { id, action: "queue" | "unqueue" | "ignore" | "restore" }
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" && UUID_RE.test(body.id) ? body.id : null;
  const transition = typeof body.action === "string" ? TRANSITIONS[body.action] : undefined;
  if (!id || !transition) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  const [from, to] = transition;
  const now = new Date().toISOString();
  const { data, error } = await adminSupabase()
    .from("prospect_sites")
    .update({ status: to, requested_at: to === "a_creer" ? now : null, updated_at: now })
    .eq("id", id)
    .in("status", from)
    .select("id");
  if (error) return NextResponse.json({ error: "Erreur" }, { status: 500 });
  // Rien de modifié : le site a déjà changé d'état (autre onglet, ou fiches déjà créées)
  if (!data || data.length === 0) return NextResponse.json({ error: "Ce site a déjà changé d’état. Rechargez la page." }, { status: 409 });
  return NextResponse.json({ ok: true, status: to });
}
