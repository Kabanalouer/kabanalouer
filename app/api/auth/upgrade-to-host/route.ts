import { NextResponse } from "next/server";
import { getRequestLocale, t2 } from "@/lib/requestLocale";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t2(locale, "Non authentifié", "Not authenticated") }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "traveler") {
    return NextResponse.json({ error: t2(locale, "Rôle non éligible", "Role not eligible") }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("users")
    .update({ role: "host" })
    .eq("id", user.id);

  if (error) {
    console.error("upgrade-to-host: échec mise à jour du rôle", error);
    return NextResponse.json({ error: t2(locale, "Erreur lors de la mise à jour de votre profil.", "Error while updating your profile.") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
