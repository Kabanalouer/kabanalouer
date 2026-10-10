import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Vignette JPG carrée d'une photo d'annonce, pour les courriels : les photos
// sont stockées en WebP, que les vieux Outlook n'affichent pas. Seules les
// photos du bucket public listing-photos sont acceptées (pas un proxy ouvert).
// GET /api/email-photo?src=<url publique Supabase>

const ALLOWED_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;
const SIZE = 176; // 88 px affichés, ×2 pour les écrans haute densité

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") ?? "";
  if (!src.startsWith(ALLOWED_PREFIX) || src.includes("..")) {
    return NextResponse.json({ error: "Source non autorisée" }, { status: 400 });
  }

  const upstream = await fetch(src).catch(() => null);
  if (!upstream?.ok) return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });

  try {
    const jpg = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .rotate()
      .resize(SIZE, SIZE, { fit: "cover" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return new NextResponse(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Conversion impossible" }, { status: 422 });
  }
}
