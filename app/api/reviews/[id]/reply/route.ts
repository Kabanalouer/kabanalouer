import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { reply } = await req.json() as { reply?: string };

  if (reply && reply.trim().length > 2000) {
    return NextResponse.json({ error: "La réponse ne peut pas dépasser 2000 caractères." }, { status: 400 });
  }

  // Get the review's listing_id + author info for the notification email
  const { data: review } = await supabase
    .from("reviews")
    .select("listing_id, author_id, rating, comment")
    .eq("id", id)
    .single();

  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });

  // Check user is the host of this listing
  const { data: listing } = await supabase
    .from("listings")
    .select("host_id, title")
    .eq("id", review.listing_id as string)
    .single();

  if (!listing || (listing.host_id as string) !== user.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const admin = adminSupabase();
  const { error } = await admin
    .from("reviews")
    .update({ host_reply: reply?.trim() || null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });

  // Email notification to the traveler — failure must not block the response
  try {
    if (process.env.RESEND_API_KEY && review.author_id && listing) {
      const [authorRes, hostRes] = await Promise.all([
        admin.from("users").select("name, email").eq("id", review.author_id as string).single(),
        supabase.from("users").select("name").eq("id", user.id).single(),
      ]);

      const authorEmail = authorRes.data?.email;
      if (authorEmail) {
        const authorFirstName = (authorRes.data?.name ?? "").split(" ")[0] || "Bonjour";
        const hostFirstName = (hostRes.data?.name ?? "Le propriétaire").split(" ")[0];
        const listingTitle = (listing.title as string) ?? "votre chalet";
        const rating = review.rating as number;
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const commentBlock = (review.comment as string | null)?.trim()
          ? `<p style="margin:0 0 4px;color:#888;font-size:13px;font-style:italic;">"${(review.comment as string).trim()}"</p>`
          : "";

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Kabanalouer <onboarding@resend.dev>",
          to: authorEmail,
          subject: `${hostFirstName} a répondu à votre avis sur ${listingTitle}`,
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
          <p style="margin:0 0 8px;color:#1a1a1a;font-size:16px;">Bonjour ${authorFirstName},</p>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            <strong>${hostFirstName}</strong> a répondu à votre avis sur <strong>${listingTitle}</strong>.
          </p>
          <!-- Original review -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f9f9f7;border-radius:8px;padding:16px 20px;width:100%;">
            <tr><td>
              <p style="margin:0 0 6px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Votre avis</p>
              <p style="margin:0 0 6px;color:#636e40;font-size:20px;letter-spacing:2px;">${stars}</p>
              ${commentBlock}
            </td></tr>
          </table>
          <!-- Host reply -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-left:3px solid #636e40;padding-left:16px;width:100%;">
            <tr><td>
              <p style="margin:0 0 6px;color:#636e40;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Réponse de ${hostFirstName}</p>
              <p style="margin:0;color:#333;font-size:15px;line-height:1.6;">${reply?.trim() ?? ""}</p>
            </td></tr>
          </table>
          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:50px;background:#636e40;">
              <a href="https://kabanalouer.vercel.app/chalets/${review.listing_id}"
                 style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:50px;">
                Voir la fiche du chalet
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
    console.error("Reply notification email error:", emailErr);
  }

  return NextResponse.json({ success: true });
}
