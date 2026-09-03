import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "traveler") {
    return NextResponse.json({ error: "Rôle non éligible" }, { status: 400 });
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
    return NextResponse.json({ error: "Erreur lors de la mise à jour de votre profil." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
