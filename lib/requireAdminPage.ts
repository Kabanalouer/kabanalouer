import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Vérification admin à refaire dans chaque page /admin qui lit des données
// avec le client service : le contrôle de app/admin/layout.tsx ne suffit pas
// à lui seul (Next ne réexécute pas toujours le layout, et la page ne doit
// jamais dépendre d'un autre fichier pour sa propre sécurité).
export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
}
