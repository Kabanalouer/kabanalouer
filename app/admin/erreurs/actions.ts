"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Actions de la page Admin → Erreurs : réglée, ignorée, rouverte.

async function assertAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  return me?.role === "admin";
}

export async function setErrorStatus(fingerprint: string, status: "resolved" | "ignored" | "open"): Promise<void> {
  if (!(await assertAdmin())) return;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const now = new Date().toISOString();
  const patch =
    status === "resolved" ? { resolved_at: now, ignored: false }
    : status === "ignored" ? { resolved_at: now, ignored: true }
    : { resolved_at: null, ignored: false };
  await admin.from("error_groups").update(patch).eq("fingerprint", fingerprint);
  revalidatePath("/admin/erreurs");
}
