import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendReviewRepliedEmail } from "@/lib/emails/reviewReplied";

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

  if (error) {
    console.error("reviews/[id]/reply: échec sauvegarde", error);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }

  // Email notification to the traveler — failure must not block the response
  try {
    const trimmedReply = reply?.trim();
    if (process.env.RESEND_API_KEY && trimmedReply && review.author_id && listing) {
      const [authorRes, hostRes] = await Promise.all([
        admin.from("users").select("name, email, preferred_language").eq("id", review.author_id as string).single(),
        supabase.from("users").select("name").eq("id", user.id).single(),
      ]);

      const authorEmail = authorRes.data?.email as string | undefined;
      if (authorEmail) {
        const lang: "fr" | "en" = authorRes.data?.preferred_language === "en" ? "en" : "fr";
        const { error: emailError } = await sendReviewRepliedEmail({
          travelerEmail: authorEmail,
          travelerFirstName: ((authorRes.data?.name as string | null) ?? "").split(" ")[0] || null,
          preferredLanguage: lang,
          hostFirstName: ((hostRes.data?.name as string | null) ?? "").split(" ")[0] || (lang === "en" ? "The owner" : "Le propriétaire"),
          listingId: review.listing_id as string,
          listingTitle: (listing.title as string) ?? (lang === "en" ? "your cabin" : "votre chalet"),
          rating: review.rating as number,
          comment: (review.comment as string | null)?.trim() || null,
          reply: trimmedReply,
        });
        if (emailError) console.error("Reply notification email error:", emailError);
      }
    }
  } catch (emailErr) {
    console.error("Reply notification email error:", emailErr);
  }

  return NextResponse.json({ success: true });
}
