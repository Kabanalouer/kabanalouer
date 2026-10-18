import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/sendMessage";
import { listInvitationCandidates, previewInvitation, type InvitationKind } from "@/lib/claims/invitations";

// Aperçu du courriel d'invitation ou de relance d'une adresse (admin seulement) : le même
// courriel que l'envoi, avec des liens d'exemple. Renvoie une page HTML, affichée dans un
// cadre isolé (sandbox) par la page /admin/invitations.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const kind = request.nextUrl.searchParams.get("kind") as InvitationKind;
  const email = (request.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  if ((kind !== "invite" && kind !== "reminder") || !email) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  const candidates = await listInvitationCandidates(adminSupabase(), kind);
  const candidate = candidates.find((c) => c.claimEmail === email);
  if (!candidate) return NextResponse.json({ error: "Cette adresse n'est plus à inviter" }, { status: 404 });

  const preview = await previewInvitation(candidate, kind);
  if (!preview) return NextResponse.json({ error: "Aperçu impossible" }, { status: 500 });
  return new NextResponse(preview.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https:",
      "X-Subject": encodeURIComponent(preview.subject),
      "Cache-Control": "no-store",
    },
  });
}
