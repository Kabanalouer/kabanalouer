import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimTravelerWelcomeSlot, sendWelcomeTravelerEmail } from "@/lib/emails/welcomeTraveler";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ skipped: true });
  }

  const claimed = await claimTravelerWelcomeSlot(supabase, user.id);
  if (!claimed) {
    return NextResponse.json({ skipped: true });
  }

  const { error } = await sendWelcomeTravelerEmail({
    email: user.email,
    preferredLanguage: claimed.preferred_language === "en" ? "en" : "fr",
    firstName: claimed.name?.trim().split(/\s+/)[0],
  });

  if (error) {
    console.error("welcome-traveler: échec envoi email de bienvenue", error);
  }

  return NextResponse.json({ sent: !error });
}
