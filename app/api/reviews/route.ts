import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { listing_id, rating, comment } = body as { listing_id?: string; rating?: number; comment?: string };

  if (!listing_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  if (comment && comment.trim().length > 2000) {
    return NextResponse.json({ error: "Le commentaire ne peut pas dépasser 2000 caractères." }, { status: 400 });
  }

  // Eligibility: user must have sent at least one message for this listing
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing_id)
    .eq("sender_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json(
      { error: "Vous devez d'abord contacter le propriétaire pour laisser un avis." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({ listing_id, author_id: user.id, rating, comment: comment?.trim() || null })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Vous avez déjà laissé un avis pour ce chalet." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur lors de la soumission." }, { status: 500 });
  }

  // Email notification — failure must not block the review
  try {
    const [listingRes, reviewerRes] = await Promise.all([
      supabase.from("listings").select("title, host_id").eq("id", listing_id).single(),
      supabase.from("users").select("name").eq("id", user.id).single(),
    ]);

    const listingTitle = listingRes.data?.title ?? "votre chalet";
    const hostId = listingRes.data?.host_id;
    const reviewerFirstName = (reviewerRes.data?.name ?? "Un voyageur").split(" ")[0];

    if (hostId && process.env.RESEND_API_KEY) {
      const { data: hostData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", hostId)
        .single();

      if (hostData?.email) {
        const hostFirstName = (hostData.name ?? "").split(" ")[0] || "Bonjour";
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const commentBlock = comment?.trim()
          ? `<p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">"${comment.trim()}"</p>`
          : "";

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Kabanalouer <onboarding@resend.dev>",
          to: hostData.email,
          subject: `Vous avez reçu un nouvel avis sur ${listingTitle}`,
          html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8;">
        <!-- Header -->
        <tr><td style="background:#636e40;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Kabanalouer</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#1a1a1a;font-size:16px;">Bonjour ${hostFirstName},</p>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            <strong>${reviewerFirstName}</strong> a laissé un avis sur <strong>${listingTitle}</strong>.
          </p>
          <!-- Rating -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f9f9f7;border-radius:8px;padding:16px 20px;width:100%;">
            <tr>
              <td>
                <p style="margin:0 0 6px;color:#636e40;font-size:22px;letter-spacing:2px;">${stars}</p>
                <p style="margin:0;color:#888;font-size:13px;">${rating}/5</p>
              </td>
            </tr>
          </table>
          ${commentBlock}
          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:50px;background:#636e40;">
              <a href="https://kabanalouer.vercel.app/dashboard/avis"
                 style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:50px;">
                Voir l'avis et répondre
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#aaa;font-size:13px;">L'équipe Kabanalouer</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      }
    }
  } catch (emailErr) {
    console.error("Review notification email error:", emailErr);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
