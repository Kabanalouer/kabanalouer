"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Statut d'un retour de proprio (Admin → Retours des proprios).
const STATUSES = ["nouveau", "en_cours", "regle", "ferme"] as const;

export async function setFeedbackStatus(id: number, status: (typeof STATUSES)[number]): Promise<void> {
  if (!STATUSES.includes(status)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await admin.from("feedback").update({ status }).eq("id", id);
  revalidatePath("/admin/retours");
}
