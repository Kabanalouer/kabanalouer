import { NextRequest } from "next/server";
import { adminSupabase } from "@/lib/sendMessage";

// Pixel invisible d'une invitation : compte la première ouverture (listing_invitations.opened_at).
// Indicatif seulement : certains clients de courriel (Apple Mail, proxys d'images) chargent
// les images sans que la personne ouvre le message. Aucune donnée personnelle n'est lue ni gardée.

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.gif$/i, "");
  if (/^[a-f0-9]{32}$/.test(clean)) {
    const { error } = await adminSupabase()
      .from("listing_invitations")
      .update({ opened_at: new Date().toISOString() })
      .eq("track_token", clean)
      .is("opened_at", null);
    if (error) console.error("invitations/open: échec", error.message);
  }
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" },
  });
}
