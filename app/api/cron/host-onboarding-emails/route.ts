import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendBoostInviteEmail, sendInstallAppGuideEmail } from "@/lib/emails/hostOnboarding";

// Cron quotidien — courriels d'accueil des nouveaux proprios, après leur
// première publication. Une annonce ne peut être publiée qu'avec un
// abonnement actif : la date du premier abonnement du proprio sert donc de
// date de première publication (aucune colonne published_at en base).
// - 48 h : invitation à booster (users.boost_invite_email_sent_at)
// - 96 h : guide installation de l'app + notifications (users.install_app_email_sent_at)
// Seulement pour les proprios publiés depuis moins de 14 jours : les comptes
// déjà établis ne reçoivent pas ces courriels d'un coup au lancement.

const H48 = 48 * 60 * 60 * 1000;
const H96 = 96 * 60 * 60 * 1000;
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();
  const now = Date.now();

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("user_id, created_at")
    .order("created_at", { ascending: true });
  if (subsError) {
    console.error("[host-onboarding-emails] lecture subscriptions", subsError);
    return NextResponse.json({ error: "Erreur de lecture." }, { status: 500 });
  }

  // Première publication par proprio
  const firstByUser = new Map<string, number>();
  for (const s of subs ?? []) {
    const uid = s.user_id as string | null;
    if (!uid || firstByUser.has(uid)) continue;
    firstByUser.set(uid, new Date(s.created_at as string).getTime());
  }

  let boostSent = 0;
  let installSent = 0;

  for (const [userId, firstAt] of firstByUser) {
    const age = now - firstAt;
    if (age < H48 || age > WINDOW_MS) continue;

    const { data: user } = await supabase
      .from("users")
      .select("email, name, preferred_language, phone, boost_invite_email_sent_at, install_app_email_sent_at")
      .eq("id", userId)
      .single();
    if (!user?.email) continue;

    const needBoost = !user.boost_invite_email_sent_at;
    const needInstall = age >= H96 && !user.install_app_email_sent_at;
    if (!needBoost && !needInstall) continue;

    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, title_en")
      .eq("host_id", userId)
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!listing) continue; // plus aucune annonce publiée : rien à envoyer

    const lang: "fr" | "en" = user.preferred_language === "en" ? "en" : "fr";
    const firstName = (user.name as string | null)?.split(" ")[0] ?? null;
    const listingTitle = ((lang === "en" && listing.title_en) || listing.title || (lang === "en" ? "your cabin" : "ton chalet")) as string;

    if (needBoost) {
      const { error } = await sendBoostInviteEmail({
        email: user.email as string, lang, firstName, listingTitle, listingId: listing.id as string,
      });
      if (error) console.error(`[host-onboarding-emails] boost ${userId}`, error);
      else {
        await supabase.from("users").update({ boost_invite_email_sent_at: new Date().toISOString() }).eq("id", userId);
        boostSent++;
      }
    }

    if (needInstall) {
      const { error } = await sendInstallAppGuideEmail({
        email: user.email as string, lang, firstName, hasPhone: !!user.phone,
      });
      if (error) console.error(`[host-onboarding-emails] install ${userId}`, error);
      else {
        await supabase.from("users").update({ install_app_email_sent_at: new Date().toISOString() }).eq("id", userId);
        installSent++;
      }
    }
  }

  return NextResponse.json({ ok: true, boostSent, installSent });
}
