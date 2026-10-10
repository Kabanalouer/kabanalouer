"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyReport } from "@/lib/weeklyReport";

// « Générer maintenant » dans Admin → Rapports (sans attendre le lundi).
export async function generateReportNow(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: "Réservé aux admins." };
  const result = await generateWeeklyReport({ sendEmail: true });
  revalidatePath("/admin/rapports");
  return { error: result.error };
}
