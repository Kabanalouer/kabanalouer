import { NextResponse } from "next/server";
import { getThemeLinkVisibility } from "@/lib/themeLinks";

// GET /api/nav/theme-links — quels liens thématiques afficher dans le menu
// mobile (Navbar est un composant client, voir lib/themeLinks.ts). Même réponse
// pour tous les visiteurs, donc cachée au CDN.
export async function GET() {
  const visibility = await getThemeLinkVisibility();
  return NextResponse.json(visibility, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" },
  });
}
